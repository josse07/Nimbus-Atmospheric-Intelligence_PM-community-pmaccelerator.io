import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Download,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Printer,
  ExternalLink,
  Youtube,
  Image as ImageIcon,
  Map as MapIcon,
  RefreshCw,
  Search,
  Sparkles,
  Play,
  X,
  Layers,
  Maximize2
} from 'lucide-react';
import { WeatherLogRecord, TemperatureUnit, BonusMedia } from '../types';
import {
  db,
  WEATHER_QUERIES_COLLECTION,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '../lib/firebase';
import { formatTemp, getWeatherInterpretation } from '../lib/weatherCodes';
import { WeatherIcon } from './WeatherIcon';
import {
  exportRecordsAsJSON,
  exportRecordsAsCSV,
  exportRecordsAsPDF,
  exportSingleRecordAsJSON,
  exportSingleRecordAsCSV,
  exportSingleRecordAsPDF
} from '../lib/exportUtils';

interface WeatherLogPageProps {
  unit: TemperatureUnit;
  onLogsChanged?: (count: number) => void;
}

export const WeatherLogPage: React.FC<WeatherLogPageProps> = ({
  unit,
  onLogsChanged,
}) => {
  const [records, setRecords] = useState<WeatherLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Form states (Create / Edit)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [formLocation, setFormLocation] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Detail Modal / Expanded record state
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [bonusMedia, setBonusMedia] = useState<BonusMedia | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState<{
    id?: string;
    title: string;
    channelTitle: string;
    videoUrl: string;
  } | null>(null);

  // Delete confirmation dialog
  const [deletingRecord, setDeletingRecord] = useState<WeatherLogRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set default start and end date (last 7 days to today)
  useEffect(() => {
    const today = new Date();
    const past7 = new Date();
    past7.setDate(today.getDate() - 6);

    setFormEndDate(today.toISOString().slice(0, 10));
    setFormStartDate(past7.toISOString().slice(0, 10));
  }, []);

  // Fetch records from Firestore
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, WEATHER_QUERIES_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const loaded: WeatherLogRecord[] = [];
      snapshot.forEach((d) => {
        loaded.push({ id: d.id, ...d.data() } as WeatherLogRecord);
      });
      setRecords(loaded);
      onLogsChanged?.(loaded.length);
    } catch (err: any) {
      console.error('Failed to load records from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Load bonus media (Map, YouTube, Unsplash) when expanding a record
  const loadBonusMedia = async (record: WeatherLogRecord) => {
    setLoadingMedia(true);
    setBonusMedia(null);
    try {
      const res = await fetch(
        `/api/bonus/media?location=${encodeURIComponent(record.resolvedPlace || record.rawLocation)}&lat=${record.coordinates?.lat}&lon=${record.coordinates?.lng}`
      );
      if (res.ok) {
        const data = await res.json();
        setBonusMedia(data);
      }
    } catch (err) {
      console.error('Error fetching bonus media:', err);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleToggleExpand = (record: WeatherLogRecord) => {
    if (expandedRecordId === record.id) {
      setExpandedRecordId(null);
      setBonusMedia(null);
    } else {
      setExpandedRecordId(record.id || null);
      loadBonusMedia(record);
    }
  };

  // Form submit handler (both Create and Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const locInput = formLocation.trim();
    if (!locInput) {
      setFormError('Please enter a location (city, postal code, GPS coordinates, or landmark).');
      return;
    }

    if (!formStartDate || !formEndDate) {
      setFormError('Please select both a start date and an end date.');
      return;
    }

    const startObj = new Date(formStartDate + 'T00:00:00Z');
    const endObj = new Date(formEndDate + 'T00:00:00Z');

    if (endObj < startObj) {
      setFormError('End date cannot be before the start date.');
      return;
    }

    const diffDays = Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 30) {
      setFormError(`Date range is ${diffDays} days. The maximum allowable range is capped at 30 days.`);
      return;
    }

    setFormSubmitting(true);

    try {
      // 1. Geocode Location
      const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(locInput)}`);
      const geoData = await geoRes.json();

      if (!geoRes.ok || !geoData.exactMatch) {
        setFormError(geoData.message || "We couldn't find that location — try a nearby city or check spelling.");
        setFormSubmitting(false);
        return;
      }

      const resolved = geoData.exactMatch;

      // 2. Fetch Range Weather Data (Historical + Forecast)
      const rangeRes = await fetch(
        `/api/weather/range?lat=${resolved.latitude}&lon=${resolved.longitude}&startDate=${formStartDate}&endDate=${formEndDate}`
      );
      const rangeData = await rangeRes.json();

      if (!rangeRes.ok) {
        setFormError(rangeData.message || 'Failed to retrieve atmospheric data for this range.');
        setFormSubmitting(false);
        return;
      }

      const recordPayload = {
        rawLocation: locInput,
        resolvedPlace: resolved.formattedName || resolved.name,
        coordinates: {
          lat: resolved.latitude,
          lng: resolved.longitude,
        },
        startDate: formStartDate,
        endDate: formEndDate,
        dailyData: rangeData.daily,
        summary: rangeData.summary,
        updatedAt: Date.now(),
      };

      if (editingRecordId) {
        // UPDATE Existing Firestore Document
        const docRef = doc(db, WEATHER_QUERIES_COLLECTION, editingRecordId);
        await updateDoc(docRef, recordPayload);
        setFormSuccess('Weather log updated successfully!');
      } else {
        // CREATE New Firestore Document
        await addDoc(collection(db, WEATHER_QUERIES_COLLECTION), {
          ...recordPayload,
          createdAt: Date.now(),
        });
        setFormSuccess('New weather query saved to your log!');
      }

      // Refresh list
      await fetchRecords();

      // Reset form
      setTimeout(() => {
        setShowCreateForm(false);
        setEditingRecordId(null);
        setFormSuccess(null);
        setFormLocation('');
      }, 1200);
    } catch (err: any) {
      console.error('Error saving weather log:', err);
      setFormError(err.message || 'An error occurred while saving to Firestore.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditClick = (record: WeatherLogRecord) => {
    setEditingRecordId(record.id || null);
    setFormLocation(record.rawLocation || record.resolvedPlace);
    setFormStartDate(record.startDate);
    setFormEndDate(record.endDate);
    setShowCreateForm(true);
    setFormError(null);
    setFormSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecord?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, WEATHER_QUERIES_COLLECTION, deletingRecord.id));
      setDeletingRecord(null);
      await fetchRecords();
    } catch (err: any) {
      console.error('Error deleting record:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(r =>
    (r.resolvedPlace || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (r.rawLocation || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
    (r.startDate || '').includes(searchFilter) ||
    (r.endDate || '').includes(searchFilter)
  );

  return (
    <div id="weather-log-page" className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">My Weather Log</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
              Firestore Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted historical logs & multi-range forecast records (Capped at 30 days per query).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create Button */}
          <button
            id="create-new-log-btn"
            onClick={() => {
              if (showCreateForm && !editingRecordId) {
                setShowCreateForm(false);
              } else {
                setEditingRecordId(null);
                setFormLocation('');
                setShowCreateForm(true);
                setFormError(null);
                setFormSuccess(null);
              }
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-sky-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm && !editingRecordId ? 'Close Form' : 'New Weather Log'}</span>
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 p-1 rounded-xl">
            <button
              id="export-json-btn"
              onClick={() => exportRecordsAsJSON(records)}
              disabled={records.length === 0}
              title="Export All Records as JSON"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
            <button
              id="export-csv-btn"
              onClick={() => exportRecordsAsCSV(records)}
              disabled={records.length === 0}
              title="Export All Records as CSV"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              id="export-pdf-btn"
              onClick={() => exportRecordsAsPDF(records)}
              disabled={records.length === 0}
              title="Printable / PDF Report"
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT FORM */}
      {showCreateForm && (
        <form
          id="weather-log-form"
          onSubmit={handleSaveRecord}
          className="p-6 rounded-2xl bg-slate-900 border border-sky-500/30 shadow-xl shadow-sky-950/30 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{editingRecordId ? 'Edit Weather Log Query' : 'Log New Weather Range Query'}</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setEditingRecordId(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location Input */}
            <div className="space-y-1.5 md:col-span-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" /> Location / GPS / Landmark
              </label>
              <input
                id="form-location-input"
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. London, 40.71, -74.00, or Eiffel Tower"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-slate-100 placeholder-slate-500 text-sm outline-none"
                required
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Start Date
              </label>
              <input
                id="form-start-date"
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-slate-100 text-sm outline-none"
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> End Date (Max 30 days)
              </label>
              <input
                id="form-end-date"
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl text-slate-100 text-sm outline-none"
                required
              />
            </div>
          </div>

          {/* Form Alerts */}
          {formError && (
            <div id="form-error-alert" className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div id="form-success-alert" className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setEditingRecordId(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
            >
              Cancel
            </button>
            <button
              id="form-submit-btn"
              type="submit"
              disabled={formSubmitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating & Storing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingRecordId ? 'Update Record' : 'Save to Firestore'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* SEARCH / FILTER LOGS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="filter-weather-logs-input"
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter saved queries by location or date..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 self-start sm:self-auto">
          <span>Total Records: <strong className="text-slate-200">{records.length}</strong></span>
          <button
            onClick={fetchRecords}
            title="Refresh from Firestore"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-sky-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* READ: LIST / TABLE OF RECORDS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <p className="text-xs text-slate-400">Syncing weather records from Firestore...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Weather Queries Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchFilter ? 'No logs matched your filter.' : 'You haven’t logged any range queries yet. Click "New Weather Log" above to add one!'}
          </p>
          {!searchFilter && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-xl"
            >
              Add First Weather Query
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const isExpanded = expandedRecordId === record.id;

            return (
              <div
                key={record.id}
                id={`weather-log-item-${record.id}`}
                className={`rounded-2xl border transition-all ${
                  isExpanded
                    ? 'bg-slate-900 border-sky-500/60 shadow-lg shadow-sky-950/20'
                    : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800'
                }`}
              >
                {/* Header Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Location & Coordinates */}
                  <div
                    onClick={() => handleToggleExpand(record)}
                    className="cursor-pointer flex-1 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                      <h3 className="font-bold text-sm sm:text-base text-slate-100 hover:text-sky-300 transition-colors">
                        {record.resolvedPlace || record.rawLocation}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-slate-300">
                        {record.coordinates?.lat?.toFixed(2)}°, {record.coordinates?.lng?.toFixed(2)}°
                      </span>
                      <span>•</span>
                      <span className="text-indigo-300">
                        {record.startDate} &rarr; {record.endDate}
                      </span>
                      <span>•</span>
                      <span className="text-slate-400">{record.dailyData?.length || 0} days</span>
                    </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div
                    onClick={() => handleToggleExpand(record)}
                    className="cursor-pointer flex items-center gap-3"
                  >
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Avg High / Low</div>
                      <div className="text-sm font-bold text-slate-100">
                        <span className="text-amber-400">{formatTemp(record.summary?.avgMaxTemp, unit)}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-sky-400">{formatTemp(record.summary?.avgMinTemp, unit)}</span>
                      </div>
                    </div>

                    <div className="hidden sm:block text-right border-l border-slate-800 pl-3">
                      <div className="text-xs text-slate-400">Precipitation</div>
                      <div className="text-xs font-semibold text-slate-200">
                        {record.summary?.totalPrecipitation ?? 0} mm
                      </div>
                    </div>
                  </div>

                  {/* Actions (Expand, Edit, Delete) */}
                  <div className="flex items-center gap-1.5 self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                    <button
                      id={`edit-record-${record.id}`}
                      onClick={() => handleEditClick(record)}
                      title="Edit this query"
                      className="p-2 hover:bg-slate-800 text-slate-400 hover:text-sky-400 rounded-lg transition-colors text-xs flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      id={`delete-record-${record.id}`}
                      onClick={() => setDeletingRecord(record)}
                      title="Delete this record"
                      className="p-2 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>

                    <button
                      onClick={() => handleToggleExpand(record)}
                      className="p-2 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors"
                      title={isExpanded ? 'Collapse details' : 'Expand full breakdown'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDED BREAKDOWN & BONUS MEDIA */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-5 bg-slate-950/60 rounded-b-2xl space-y-6 animate-fade-in">
                    {/* Day-by-Day Historical / Forecast Table */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-sky-400" />
                            <span>Day-by-Day Atmospheric Breakdown</span>
                          </h4>
                          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
                            <button
                              id={`export-record-json-${record.id}`}
                              onClick={() => exportSingleRecordAsJSON(record)}
                              title="Download this log as JSON"
                              className="px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition-colors"
                            >
                              <FileJson className="w-3 h-3 text-amber-400" />
                              <span>Export JSON</span>
                            </button>
                            <button
                              id={`export-record-csv-${record.id}`}
                              onClick={() => exportSingleRecordAsCSV(record)}
                              title="Download daily breakdown as CSV"
                              className="px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition-colors"
                            >
                              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                              <span>Export CSV</span>
                            </button>
                            <button
                              id={`export-record-pdf-${record.id}`}
                              onClick={() => exportSingleRecordAsPDF(record)}
                              title="Printable / PDF Report for this record"
                              className="px-2 py-1 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center gap-1 transition-colors"
                            >
                              <Printer className="w-3 h-3 text-sky-400" />
                              <span>Export PDF</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Historical
                          </span>
                          <span className="flex items-center gap-1 text-sky-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-sky-400" /> Forecast
                          </span>
                          <span className="flex items-center gap-1 text-amber-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-400" /> Unpredictable (&gt;16d)
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Source</th>
                              <th className="p-3">Condition</th>
                              <th className="p-3">High Temp</th>
                              <th className="p-3">Low Temp</th>
                              <th className="p-3">Mean Temp</th>
                              <th className="p-3">Precipitation</th>
                              <th className="p-3">Wind Max</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {record.dailyData?.map((day, idx) => {
                              const interp = getWeatherInterpretation(day.weatherCode);

                              return (
                                <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                                  <td className="p-3 font-medium text-slate-200">
                                    {day.date} <span className="text-slate-500 font-normal">({day.dayName})</span>
                                  </td>
                                  <td className="p-3">
                                    {day.source === 'historical' && (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                                        Historical Archive
                                      </span>
                                    )}
                                    {day.source === 'forecast' && (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-medium">
                                        Forecast API
                                      </span>
                                    )}
                                    {day.source === 'unsupported_future' && (
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 font-medium" title={day.note}>
                                        Beyond 16d
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <WeatherIcon weatherCode={day.weatherCode} className="w-4 h-4" />
                                      <span className="text-slate-300">{interp.label}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 font-semibold text-amber-400">
                                    {day.maxTemp != null ? formatTemp(day.maxTemp, unit) : '--'}
                                  </td>
                                  <td className="p-3 font-semibold text-sky-400">
                                    {day.minTemp != null ? formatTemp(day.minTemp, unit) : '--'}
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    {day.meanTemp != null ? formatTemp(day.meanTemp, unit) : '--'}
                                  </td>
                                  <td className="p-3 text-slate-300">
                                    {day.precipitation != null ? `${day.precipitation} mm` : '--'}
                                  </td>
                                  <td className="p-3 text-slate-400">
                                    {day.windSpeedMax ? `${day.windSpeedMax} km/h` : '--'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* GEOSPATIAL & MULTIMEDIA INTEGRATION (Map Embed, YouTube Videos, Unsplash Photo) */}
                    <div id={`record-media-panel-${record.id}`} className="border-t border-slate-800 pt-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Geospatial & Multimedia Intelligence</span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {record.coordinates?.lat?.toFixed(3)}°N, {record.coordinates?.lng?.toFixed(3)}°E • {record.resolvedPlace || record.rawLocation}
                        </span>
                      </div>

                      {loadingMedia ? (
                        <div className="flex items-center justify-center p-8 text-xs text-slate-400 gap-2 bg-slate-900/80 rounded-xl border border-slate-800">
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                          <span>Retrieving interactive map coordinates, atmospheric videos & regional photography...</span>
                        </div>
                      ) : bonusMedia ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                          {/* 1. Embedded Interactive Map */}
                          <div className="lg:col-span-6 space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                              <span className="flex items-center gap-1.5">
                                <MapIcon className="w-3.5 h-3.5 text-sky-400" />
                                <span>Interactive Location Map</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${record.coordinates?.lat},${record.coordinates?.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                                  title="Open in Google Maps in new tab"
                                >
                                  <span>Google Maps</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <span className="text-slate-600">•</span>
                                <a
                                  href={`https://www.openstreetmap.org/?mlat=${record.coordinates?.lat}&mlon=${record.coordinates?.lng}#map=12/${record.coordinates?.lat}/${record.coordinates?.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
                                  title="Open in OpenStreetMap"
                                >
                                  <span>OSM</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                            <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative shadow-inner">
                              <iframe
                                title={`Location Map for ${record.resolvedPlace || record.rawLocation}`}
                                src={bonusMedia.mapEmbedUrl}
                                className="w-full h-full border-0"
                                loading="lazy"
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                Lat: {record.coordinates?.lat?.toFixed(4)}, Lon: {record.coordinates?.lng?.toFixed(4)}
                              </span>
                              <span>Live Geo-Resolution</span>
                            </div>
                          </div>

                          {/* 2. Unsplash Regional Photography */}
                          {bonusMedia.photo && (
                            <div className="lg:col-span-6 space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                                  <span>Regional Landscape Photography</span>
                                </span>
                                <a
                                  href={bonusMedia.photo.photographerUrl || 'https://unsplash.com'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                                >
                                  <span>Unsplash</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative group shadow-inner">
                                <img
                                  src={bonusMedia.photo.imageUrl}
                                  alt={bonusMedia.photo.description || 'Location view'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent text-[11px] text-slate-300 flex justify-between items-center">
                                  <span className="truncate max-w-xs font-medium text-slate-200">
                                    {bonusMedia.photo.description}
                                  </span>
                                  <span className="text-slate-400 text-[10px] shrink-0">
                                    Photo by {bonusMedia.photo.photographerName}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                                <span>Curated for {record.resolvedPlace || record.rawLocation}</span>
                                <span>HD Photography</span>
                              </div>
                            </div>
                          )}

                          {/* 3. YouTube Travel & Atmospheric Videos */}
                          {bonusMedia.videos && bonusMedia.videos.length > 0 && (
                            <div id={`record-youtube-panel-${record.id}`} className="lg:col-span-12 space-y-3 pt-2">
                              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                                <span className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-red-600 text-white">
                                    <Youtube className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-slate-100 font-bold">YouTube Atmospheric & Travel Features</span>
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-normal">
                                    {bonusMedia.videos.length} videos found
                                  </span>
                                </span>
                                <span className="text-[11px] text-slate-400">Click any video to play inline</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {bonusMedia.videos.map((vid, vIdx) => (
                                  <div
                                    key={vIdx}
                                    id={`youtube-video-card-${vIdx}`}
                                    onClick={() => setActiveVideoModal(vid)}
                                    className="cursor-pointer p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-sky-500/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-sky-500/10"
                                  >
                                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-950 relative mb-2.5">
                                      <img
                                        src={vid.thumbnail}
                                        alt={vid.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-red-600/90 group-hover:bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                          <Play className="w-5 h-5 fill-white ml-0.5" />
                                        </div>
                                      </div>
                                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-semibold text-slate-200">
                                        Watch
                                      </div>
                                    </div>

                                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                                      <h5 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-sky-300 transition-colors leading-snug">
                                        {vid.title}
                                      </h5>
                                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                                        <span className="truncate max-w-[140px] text-slate-300 font-medium">{vid.channelTitle}</span>
                                        <span className="text-sky-400 text-[10px] font-semibold flex items-center gap-0.5 group-hover:underline">
                                          <span>Play</span>
                                          <Play className="w-2.5 h-2.5 fill-sky-400" />
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* YOUTUBE VIDEO PLAYER MODAL */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col space-y-0">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-600 text-white">
                  <Youtube className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 line-clamp-1 max-w-lg">
                    {activeVideoModal.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">{activeVideoModal.channelTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeVideoModal.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors"
                  title="Open on YouTube"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player Frame */}
            <div className="aspect-video w-full bg-black relative">
              {activeVideoModal.id && activeVideoModal.id !== 'v1' && activeVideoModal.id !== 'v2' ? (
                <iframe
                  title={activeVideoModal.title}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.id}?autoplay=1&rel=0`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-950">
                  <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center">
                    <Youtube className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-sm font-bold text-slate-100">{activeVideoModal.title}</h4>
                    <p className="text-xs text-slate-400">
                      Watch this atmospheric documentary stream and travel journey directly on YouTube.
                    </p>
                  </div>
                  <a
                    href={activeVideoModal.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Watch on YouTube</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete Weather Log</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete the weather record for{' '}
              <strong className="text-slate-100">{deletingRecord.resolvedPlace || deletingRecord.rawLocation}</strong>{' '}
              ({deletingRecord.startDate} to {deletingRecord.endDate})?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

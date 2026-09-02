import { WeatherLogRecord } from '../types';

export function exportSingleRecordAsJSON(record: WeatherLogRecord) {
  const dataStr = JSON.stringify(record, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = (record.resolvedPlace || record.rawLocation || 'record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  link.download = `weather-log-${cleanName}-${record.startDate}-to-${record.endDate}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleRecordAsCSV(record: WeatherLogRecord) {
  const headers = [
    'Date',
    'Day Name',
    'Source',
    'Weather Code',
    'Condition Description',
    'Max Temp (°C)',
    'Min Temp (°C)',
    'Mean Temp (°C)',
    'Precipitation (mm)',
    'Max Wind Speed (km/h)'
  ];

  const rows = (record.dailyData || []).map(day => [
    `"${day.date}"`,
    `"${day.dayName}"`,
    `"${day.source}"`,
    day.weatherCode ?? '',
    `"${day.source === 'unsupported_future' ? 'Beyond Forecast Window' : ''}"`,
    day.maxTemp ?? '',
    day.minTemp ?? '',
    day.meanTemp ?? '',
    day.precipitation ?? 0,
    day.windSpeedMax ?? ''
  ]);

  const metaHeader = [
    `# Location: "${(record.resolvedPlace || record.rawLocation || '').replace(/"/g, '""')}"`,
    `# Coordinates: ${record.coordinates?.lat}, ${record.coordinates?.lng}`,
    `# Date Range: ${record.startDate} to ${record.endDate}`,
    `# Total Days: ${record.dailyData?.length || 0}`,
    `# Avg Max Temp: ${record.summary?.avgMaxTemp ?? ''}°C | Avg Min Temp: ${record.summary?.avgMinTemp ?? ''}°C`,
    `# Total Precipitation: ${record.summary?.totalPrecipitation ?? 0} mm`,
    ''
  ].join('\n');

  const csvContent = metaHeader + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = (record.resolvedPlace || record.rawLocation || 'record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  link.download = `weather-log-${cleanName}-${record.startDate}-to-${record.endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleRecordAsPDF(record: WeatherLogRecord) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  const cleanLocation = record.resolvedPlace || record.rawLocation || 'Unknown Location';
  const dailyRowsHtml = (record.dailyData || []).map((day, idx) => {
    const isHist = day.source === 'historical';
    const isFc = day.source === 'forecast';
    const sourceLabel = isHist ? 'Historical' : isFc ? 'Forecast' : 'Beyond Forecast Window';
    const sourceBg = isHist ? '#ecfdf5' : isFc ? '#f0f9ff' : '#fffbeb';
    const sourceColor = isHist ? '#059669' : isFc ? '#0284c7' : '#d97706';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${day.date}</td>
        <td style="padding: 8px 10px; color: #475569;">${day.dayName}</td>
        <td style="padding: 8px 10px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${sourceBg}; color: ${sourceColor};">
            ${sourceLabel}
          </span>
        </td>
        <td style="padding: 8px 10px; font-weight: 600; color: #b91c1c;">${day.maxTemp != null ? `${day.maxTemp}°C` : '--'}</td>
        <td style="padding: 8px 10px; font-weight: 600; color: #0369a1;">${day.minTemp != null ? `${day.minTemp}°C` : '--'}</td>
        <td style="padding: 8px 10px; color: #334155;">${day.meanTemp != null ? `${day.meanTemp}°C` : '--'}</td>
        <td style="padding: 8px 10px; color: #2563eb; font-weight: 500;">${day.precipitation != null ? `${day.precipitation} mm` : '0 mm'}</td>
        <td style="padding: 8px 10px; color: #475569;">${day.windSpeedMax != null ? `${day.windSpeedMax} km/h` : '--'}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Weather Report - ${cleanLocation} (${record.startDate} to ${record.endDate})</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 36px;
            color: #0f172a;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #0369a1;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 14px;
            color: #334155;
            margin: 0;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
            text-align: right;
          }
          .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
          }
          .card-label {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            color: #64748b;
            margin-bottom: 4px;
          }
          .card-value {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            text-align: left;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 600;
          }
          .footer {
            margin-top: 36px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          .btn-print {
            padding: 8px 16px;
            background: #0284c7;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
          }
          @media print {
            body { margin: 15px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 16px; border-radius: 8px;">
          <div>
            <strong>Ready to print or save as PDF</strong> — Click the button or use Ctrl+P (Cmd+P on Mac).
          </div>
          <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">${cleanLocation}</h1>
            <p class="subtitle">Weather Report • <strong>${record.startDate}</strong> to <strong>${record.endDate}</strong> (${record.dailyData?.length || 0} days)</p>
          </div>
          <div class="meta">
            <div>GPS: ${record.coordinates?.lat?.toFixed(4)}°, ${record.coordinates?.lng?.toFixed(4)}°</div>
            <div>Generated on ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <div class="card-label">Avg Max Temp</div>
            <div class="card-value" style="color: #b91c1c;">${record.summary?.avgMaxTemp != null ? `${record.summary.avgMaxTemp}°C` : '--'}</div>
          </div>
          <div class="card">
            <div class="card-label">Avg Min Temp</div>
            <div class="card-value" style="color: #0369a1;">${record.summary?.avgMinTemp != null ? `${record.summary.avgMinTemp}°C` : '--'}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Precip.</div>
            <div class="card-value" style="color: #2563eb;">${record.summary?.totalPrecipitation ?? 0} mm</div>
          </div>
          <div class="card">
            <div class="card-label">Dominant Weather</div>
            <div class="card-value">${record.summary?.dominantCondition || 'Normal'}</div>
          </div>
        </div>

        <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 16px 0 8px 0;">
          Daily Meteorological Breakdown
        </h3>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Source</th>
              <th>High Temp</th>
              <th>Low Temp</th>
              <th>Mean Temp</th>
              <th>Precipitation</th>
              <th>Max Wind</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Nimbus Atmospheric Intelligence • PM Accelerator Technical Assessment</div>
          <div>Built by Ayoola Balogun</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportRecordsAsJSON(records: WeatherLogRecord[]) {
  const dataStr = JSON.stringify(records, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weather-queries-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRecordsAsCSV(records: WeatherLogRecord[]) {
  const headers = [
    'Record ID',
    'Raw Location Query',
    'Resolved Place Name',
    'Latitude',
    'Longitude',
    'Start Date',
    'End Date',
    'Total Days',
    'Avg Max Temp (°C)',
    'Avg Min Temp (°C)',
    'Avg Mean Temp (°C)',
    'Dominant Condition',
    'Total Precipitation (mm)',
    'Created At'
  ];

  const rows = records.map(r => [
    `"${r.id || ''}"`,
    `"${(r.rawLocation || '').replace(/"/g, '""')}"`,
    `"${(r.resolvedPlace || '').replace(/"/g, '""')}"`,
    r.coordinates?.lat ?? '',
    r.coordinates?.lng ?? '',
    `"${r.startDate}"`,
    `"${r.endDate}"`,
    r.dailyData?.length ?? 0,
    r.summary?.avgMaxTemp ?? '',
    r.summary?.avgMinTemp ?? '',
    r.summary?.avgMeanTemp ?? '',
    `"${r.summary?.dominantCondition || ''}"`,
    r.summary?.totalPrecipitation ?? 0,
    `"${new Date(r.createdAt || Date.now()).toISOString()}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weather-queries-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportRecordsAsPDF(records: WeatherLogRecord[]) {
  // Generate a dedicated printable HTML report formatted for crisp printing or Save as PDF
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report.');
    return;
  }

  const rowsHtml = records.map((r, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 10px; font-weight: 600; color: #0f172a;">${r.resolvedPlace || r.rawLocation}</td>
      <td style="padding: 10px; color: #475569; font-size: 13px;">${r.coordinates?.lat?.toFixed(4)}, ${r.coordinates?.lng?.toFixed(4)}</td>
      <td style="padding: 10px; color: #334155; font-size: 13px;">${r.startDate} to ${r.endDate}</td>
      <td style="padding: 10px; color: #0f172a; font-weight: 600;">${r.summary?.avgMaxTemp ?? '--'}°C / ${r.summary?.avgMinTemp ?? '--'}°C</td>
      <td style="padding: 10px; color: #2563eb; font-weight: 500;">${r.summary?.dominantCondition || 'Standard'}</td>
      <td style="padding: 10px; color: #64748b; font-size: 12px;">${new Date(r.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Weather Logs Report - Nimbus</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #0f172a; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 700; color: #0369a1; margin: 0; }
          .meta { font-size: 13px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #0f172a; color: #ffffff; text-align: left; padding: 10px; font-size: 13px; font-weight: 600; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Nimbus Weather Query Log</h1>
            <div class="meta">Exported ${records.length} historical & forecast records</div>
          </div>
          <div class="meta">
            Generated on ${new Date().toLocaleString()}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>GPS Coordinates</th>
              <th>Date Range</th>
              <th>Avg High/Low</th>
              <th>Dominant Condition</th>
              <th>Logged Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Nimbus Atmospheric Intelligence • PM Accelerator Assessment</div>
          <div>Built by Ayoola Balogun</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

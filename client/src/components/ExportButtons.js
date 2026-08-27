import React from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ExportButtons = ({ data, columns, filename = 'export' }) => {
    
    const exportPDF = () => {
        const doc = new jsPDF();
        const tableColumn = columns.map(c => c.header);
        const tableRows = data.map(row => columns.map(col => row[col.key]));
        
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20,
        });
        
        doc.text(`${filename.toUpperCase()} REPORT`, 14, 15);
        doc.save(`${filename}.pdf`);
    };

    const exportExcel = () => {
        const worksheetData = data.map(row => {
            let rowData = {};
            columns.forEach(col => {
                rowData[col.header] = row[col.key];
            });
            return rowData;
        });
        
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
        
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" style={{ backgroundColor: '#e11d48', color: 'white' }} onClick={exportPDF}>Export PDF</button>
            <button className="btn" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={exportExcel}>Export Excel</button>
        </div>
    );
};

export default ExportButtons;

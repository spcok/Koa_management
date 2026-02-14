
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, Header, ImageRun, AlignmentType, BorderStyle, VerticalAlign } from "docx";
import FileSaver from "file-saver";
import { OrganizationProfile, Animal, LogEntry, Incident, SiteLogEntry, LogType, IncidentSeverity } from "../types";

const MARGINS = {
    top: 720, // 0.5 inch (Twips)
    bottom: 720,
    left: 720,
    right: 720,
};

// Helper to fetch image as ArrayBuffer for docx
const urlToBuffer = async (url: string): Promise<ArrayBuffer | null> => {
    try {
        const response = await fetch(url);
        return await response.arrayBuffer();
    } catch (error) {
        console.error("Failed to load image for document", error);
        return null;
    }
};

export const DocumentService = {
    
    // --- HEADER GENERATOR ---
    createHeader: async (profile: OrganizationProfile | null): Promise<Header> => {
        let logoRun: ImageRun | TextRun = new TextRun("");
        
        if (profile?.logoUrl) {
            const buffer = await urlToBuffer(profile.logoUrl);
            if (buffer) {
                logoRun = new ImageRun({
                    data: buffer,
                    transformation: { width: 50, height: 50 },
                });
            }
        }

        return new Header({
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NIL },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                        left: { style: BorderStyle.NIL },
                        right: { style: BorderStyle.NIL },
                        insideVertical: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.NIL },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [logoRun] })],
                                    width: { size: 15, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: profile?.name || "Institution Name", bold: true, size: 28, font: "Calibri" }),
                                                new TextRun({ text: "\n", font: "Calibri" }),
                                                new TextRun({ text: `License No: ${profile?.licenseNumber || "N/A"}`, size: 16, color: "666666", font: "Calibri" }),
                                            ],
                                            alignment: AlignmentType.RIGHT,
                                        }),
                                        new Paragraph({
                                            children: [
                                                new TextRun({ text: profile?.address?.replace(/\n/g, ", ") || "", size: 14, color: "888888", font: "Calibri" })
                                            ],
                                            alignment: AlignmentType.RIGHT,
                                        })
                                    ],
                                    width: { size: 85, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }), // Spacer
            ],
        });
    },

    // --- REPORT: STOCK LIST (SECTION 9) ---
    generateStockList: async (animals: Animal[], profile: OrganizationProfile | null) => {
        const header = await DocumentService.createHeader(profile);
        
        const tableRows = [
            new TableRow({
                tableHeader: true,
                children: ["ID / Ring", "Common Name", "Scientific Name", "Sex", "Origin", "Arrival"].map(text => 
                    new TableCell({
                        children: [new Paragraph({ text, bold: true, size: 16, font: "Calibri" })],
                        shading: { fill: "F3F4F6" },
                        verticalAlign: VerticalAlign.CENTER,
                    })
                ),
            }),
            ...animals.map(a => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: a.ringNumber || a.microchip || "-", size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: a.name, bold: true, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: a.latinName || "-", italics: true, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: a.sex || "?", size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: a.origin || "Unknown", size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: a.arrivalDate || "-", size: 14, font: "Calibri" })] }),
                ]
            }))
        ];

        const doc = new Document({
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    new Paragraph({
                        text: "STATUTORY STOCK LIST (SECTION 9)",
                        heading: "Heading2",
                        spacing: { after: 200 },
                        alignment: AlignmentType.CENTER
                    }),
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Stock_List_${new Date().toISOString().split('T')[0]}.docx`);
    },

    // --- REPORT: DAILY HUSBANDRY ---
    generateDailyLog: async (logs: any[], profile: OrganizationProfile | null, dateRange: string) => {
        const header = await DocumentService.createHeader(profile);

        const tableRows = [
            new TableRow({
                tableHeader: true,
                children: ["Time", "Subject", "Type", "Entry / Details", "Staff"].map(text => 
                    new TableCell({
                        children: [new Paragraph({ text, bold: true, size: 16, font: "Calibri" })],
                        shading: { fill: "F3F4F6" },
                    })
                ),
            }),
            ...logs.map(l => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: l.time, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: l.subject, bold: true, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: l.type, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: l.value, size: 14, font: "Calibri" })] }),
                    new TableCell({ children: [new Paragraph({ text: l.initials || "-", size: 14, font: "Calibri" })] }),
                ]
            }))
        ];

        const doc = new Document({
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    new Paragraph({
                        text: `DAILY HUSBANDRY LOG (${dateRange})`,
                        heading: "Heading2",
                        spacing: { after: 200 },
                        alignment: AlignmentType.CENTER
                    }),
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Husbandry_Log_${new Date().toISOString().split('T')[0]}.docx`);
    },

    // --- REPORT: INCIDENTS (FORM LAYOUT) ---
    generateIncidentReport: async (incidents: Incident[], profile: OrganizationProfile | null) => {
        const header = await DocumentService.createHeader(profile);

        const incidentTables = incidents.map(inc => {
            return [
                new Paragraph({ text: "", spacing: { after: 300 } }), // Spacing between incidents
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 2 },
                        bottom: { style: BorderStyle.SINGLE, size: 2 },
                        left: { style: BorderStyle.SINGLE, size: 2 },
                        right: { style: BorderStyle.SINGLE, size: 2 },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                    },
                    rows: [
                        // Row 1: Header Info
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "DATE/TIME", bold: true, size: 14 })] })],
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    shading: { fill: "F9FAFB" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: `${new Date(inc.date).toLocaleDateString()} ${inc.time}`, size: 14 })],
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "LOCATION", bold: true, size: 14 })] })],
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    shading: { fill: "F9FAFB" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: inc.location, size: 14 })],
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                }),
                            ]
                        }),
                        // Row 2: Type & Severity
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "CATEGORY", bold: true, size: 14 })] })],
                                    shading: { fill: "F9FAFB" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ text: inc.type, size: 14 })],
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "SEVERITY", bold: true, size: 14 })] })],
                                    shading: { fill: "F9FAFB" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ 
                                        children: [new TextRun({ text: inc.severity, bold: true, color: inc.severity === IncidentSeverity.CRITICAL ? "FF0000" : "000000", size: 14 })] 
                                    })],
                                }),
                            ]
                        }),
                        // Row 3: Narrative Header
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ text: "INCIDENT DETAILS / NARRATIVE", bold: true, size: 14 })],
                                    shading: { fill: "E5E7EB" }
                                })
                            ]
                        }),
                        // Row 4: Narrative Body
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ text: inc.description, size: 14 })],
                                    verticalAlign: VerticalAlign.TOP,
                                    height: { value: 1440, rule: "atLeast" } // Min height 1 inch
                                })
                            ]
                        }),
                        // Row 5: Actions Header
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ text: "IMMEDIATE ACTIONS TAKEN", bold: true, size: 14 })],
                                    shading: { fill: "E5E7EB" }
                                })
                            ]
                        }),
                        // Row 6: Actions Body
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ text: inc.actionsTaken || "None recorded.", size: 14 })],
                                    verticalAlign: VerticalAlign.TOP,
                                    height: { value: 720, rule: "atLeast" } // Min height 0.5 inch
                                })
                            ]
                        }),
                        // Row 7: Signoff
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 2,
                                    children: [new Paragraph({ text: `Reported By: ${inc.reportedBy}`, bold: true, size: 14 })],
                                }),
                                new TableCell({
                                    columnSpan: 2,
                                    children: [new Paragraph({ text: `Status: ${inc.status}`, alignment: AlignmentType.RIGHT, bold: true, size: 14 })],
                                }),
                            ]
                        })
                    ]
                })
            ];
        }).flat();

        const doc = new Document({
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    new Paragraph({
                        text: "INCIDENT & SAFETY REGISTER",
                        heading: "Heading2",
                        spacing: { after: 400 },
                        alignment: AlignmentType.CENTER
                    }),
                    ...incidentTables
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Incident_Log_${new Date().toISOString().split('T')[0]}.docx`);
    }
};

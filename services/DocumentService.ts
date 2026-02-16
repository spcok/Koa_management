import { 
    Document, 
    Packer, 
    Paragraph, 
    TextRun, 
    Table, 
    TableRow, 
    TableCell, 
    WidthType, 
    Header, 
    ImageRun, 
    AlignmentType, 
    BorderStyle, 
    VerticalAlign,
    HeadingLevel,
    HeightRule,
    ShadingType
} from "docx";
import FileSaver from "file-saver";
import { OrganizationProfile, Animal, Incident, User } from "../types";

const MARGINS = {
    top: 720, // 0.5 inch
    bottom: 720,
    left: 720,
    right: 720,
};

// Colors
const COLOR_PRIMARY = "111827"; // Very Dark Gray/Black for Titles
const COLOR_ACCENT = "6B7280"; // Gray for subtitles
const COLOR_BLACK = "000000";

// Helper to fetch image as ArrayBuffer
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
    
    // --- 1. HEADER GENERATOR (Centre Identity) ---
    createHeader: async (profile: OrganizationProfile | null, reportTitle: string = "STATUTORY RECORD", dateRangeText: string): Promise<Header> => {
        let logoRun: ImageRun | TextRun = new TextRun("");
        
        if (profile?.logoUrl) {
            const buffer = await urlToBuffer(profile.logoUrl);
            if (buffer) {
                logoRun = new ImageRun({
                    data: buffer,
                    transformation: { width: 60, height: 60 },
                    type: "png"
                });
            }
        }

        const orgName = (profile?.name || "KENT OWL ACADEMY").toUpperCase();
        const licenseNo = profile?.licenseNumber || "UNKNOWN";

        return new Header({
            children: [
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.NIL },
                        bottom: { style: BorderStyle.SINGLE, size: 24, color: "000000" }, // Thick black bottom border
                        left: { style: BorderStyle.NIL },
                        right: { style: BorderStyle.NIL },
                        insideVertical: { style: BorderStyle.NIL },
                        insideHorizontal: { style: BorderStyle.NIL },
                    },
                    rows: [
                        new TableRow({
                            children: [
                                // Column 1: Logo (Left)
                                new TableCell({
                                    children: [new Paragraph({ children: [logoRun] })],
                                    width: { size: 10, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                                
                                // Column 2: Titles (Middle-Left)
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({ 
                                                    text: reportTitle, 
                                                    bold: true, 
                                                    size: 40, // 20pt
                                                    font: "Arial Black",
                                                    color: COLOR_PRIMARY
                                                }),
                                            ],
                                            spacing: { after: 60 }
                                        }),
                                        new Paragraph({
                                            children: [
                                                new TextRun({ 
                                                    text: `STATUTORY RECORD • ZOO LICENSING ACT 1981 SECTION 9 • ${orgName}`, 
                                                    bold: true,
                                                    size: 16, // 8pt
                                                    font: "Arial",
                                                    color: COLOR_ACCENT
                                                })
                                            ],
                                            spacing: { after: 40 }
                                        }),
                                        new Paragraph({
                                            children: [
                                                new TextRun({ 
                                                    text: `LICENSE: ${licenseNo}`, 
                                                    bold: true,
                                                    size: 16, // 8pt
                                                    font: "Arial",
                                                    color: "9CA3AF" // Lighter gray
                                                })
                                            ],
                                            spacing: { after: 120 } // Padding bottom before border
                                        })
                                    ],
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                    margins: { left: 200 }
                                }),

                                // Column 3: Date Badge (Right)
                                new TableCell({
                                    children: [
                                        new Table({
                                            width: { size: 2400, type: WidthType.DXA }, // Approx width for badge
                                            rows: [
                                                new TableRow({
                                                    children: [
                                                        new TableCell({
                                                            children: [
                                                                new Paragraph({
                                                                    children: [
                                                                        new TextRun({
                                                                            text: dateRangeText,
                                                                            bold: true,
                                                                            color: "FFFFFF",
                                                                            font: "Arial",
                                                                            size: 24
                                                                        })
                                                                    ],
                                                                    alignment: AlignmentType.CENTER
                                                                })
                                                            ],
                                                            shading: {
                                                                fill: "111827", // Dark background
                                                                type: ShadingType.CLEAR,
                                                                color: "auto"
                                                            },
                                                            verticalAlign: VerticalAlign.CENTER,
                                                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                                                            borders: {
                                                                top: { style: BorderStyle.NIL },
                                                                bottom: { style: BorderStyle.NIL },
                                                                left: { style: BorderStyle.NIL },
                                                                right: { style: BorderStyle.NIL }
                                                            }
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    ],
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    verticalAlign: VerticalAlign.CENTER,
                                }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ text: "", spacing: { after: 400 } }), // Spacer after header
            ],
        });
    },

    // --- 2. SIGNATURE BLOCK GENERATOR (User Context) ---
    createSignatureBlock: async (user: User | null | undefined): Promise<Paragraph[]> => {
        if (!user) return [];

        let sigImage: ImageRun | null = null;
        if (user.signature) {
            const buffer = await urlToBuffer(user.signature);
            if (buffer) {
                sigImage = new ImageRun({
                    data: buffer,
                    transformation: { width: 150, height: 60 }, // Approx 4cm width
                    type: "png"
                });
            }
        }

        const now = new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' });

        return [
            new Paragraph({
                text: "",
                spacing: { before: 800, after: 200 },
                border: {
                    top: { style: BorderStyle.SINGLE, size: 6, space: 1, color: "AAAAAA" } // Divider line
                }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Digitally Generated By: ", bold: true, font: "Arial", size: 20 }),
                    new TextRun({ text: user.name, font: "Arial", size: 20 })
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Role: ", bold: true, font: "Arial", size: 20 }),
                    new TextRun({ text: user.role || "Staff", font: "Arial", size: 20 })
                ]
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Date Generated: ", bold: true, font: "Arial", size: 20 }),
                    new TextRun({ text: now, font: "Arial", size: 20 })
                ]
            }),
            // Signature Image (if exists)
            sigImage ? new Paragraph({ children: [sigImage], spacing: { before: 200, after: 100 } }) : new Paragraph({}),
            
            // Disclaimer
            new Paragraph({
                children: [
                    new TextRun({ 
                        text: "This record is electronically verified and requires no physical signature.", 
                        italics: true, 
                        size: 16, // 8pt
                        color: "666666",
                        font: "Arial"
                    })
                ],
                spacing: { before: 100 }
            })
        ];
    },

    // --- REPORT: STOCK LIST (SECTION 9) ---
    generateStockList: async (animals: Animal[], profile: OrganizationProfile | null, currentUser?: User | null) => {
        const header = await DocumentService.createHeader(profile, "STOCK LIST (SECTION 9)", new Date().getFullYear().toString());
        const signature = await DocumentService.createSignatureBlock(currentUser);
        
        const tableRows = [
            new TableRow({
                tableHeader: true,
                children: ["ID / Ring", "Common Name", "Scientific Name", "Sex", "Origin", "Arrival"].map(text => 
                    new TableCell({
                        children: [new Paragraph({ 
                            children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "FFFFFF" })]
                        })],
                        shading: { fill: "1F2937" }, // Dark header
                        verticalAlign: VerticalAlign.CENTER,
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    })
                ),
            }),
            ...animals.map(a => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.ringNumber || a.microchip || "-", size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.name, bold: true, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.latinName || "-", italics: true, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.sex || "?", size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.origin || "Unknown", size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: a.arrivalDate ? new Date(a.arrivalDate).toLocaleDateString('en-GB') : "-", size: 22, font: "Arial" })] })] }),
                ]
            }))
        ];

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Arial",
                            size: 22, 
                            color: COLOR_BLACK,
                        },
                    },
                },
            },
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    ...signature 
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Stock_List_${new Date().toISOString().split('T')[0]}.docx`);
    },

    // --- REPORT: DAILY HUSBANDRY ---
    generateDailyLog: async (logs: any[], profile: OrganizationProfile | null, dateRangeText: string, currentUser?: User | null, reportTitle: string = "DAILY LOG") => {
        const header = await DocumentService.createHeader(profile, reportTitle, dateRangeText);
        const signature = await DocumentService.createSignatureBlock(currentUser);

        const tableRows = [
            new TableRow({
                tableHeader: true,
                children: ["Animal", "Time", "Weight", "Feed", "Notes / Activity", "Staff"].map(text => 
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "FFFFFF" })] })],
                        shading: { fill: "1F2937" },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    })
                ),
            }),
            ...logs.map(l => new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.subject, bold: true, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.time, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.weight, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.feed, size: 22, font: "Arial" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.value, size: 20, font: "Arial" })] })] }), // Notes might be longer, slightly smaller text
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.initials || "-", size: 22, font: "Arial" })] })] }),
                ]
            }))
        ];

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "Arial", size: 22, color: COLOR_BLACK },
                    },
                },
            },
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }),
                    ...signature
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Husbandry_Log_${new Date().toISOString().split('T')[0]}.docx`);
    },

    // --- REPORT: INCIDENTS (FORM LAYOUT) ---
    generateIncidentReport: async (incidents: Incident[], profile: OrganizationProfile | null, dateRangeText: string, currentUser?: User | null, reportTitle: string = "INCIDENT LOG") => {
        const header = await DocumentService.createHeader(profile, reportTitle, dateRangeText);
        const signature = await DocumentService.createSignatureBlock(currentUser);

        const incidentTables = incidents.map(inc => {
            return [
                new Paragraph({ text: "", spacing: { after: 300 } }),
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
                        // Row 1
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "DATE/TIME", bold: true, font: "Arial", size: 22 })] })],
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    shading: { fill: "F3F4F6" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: `${new Date(inc.date).toLocaleDateString('en-GB')} ${inc.time}`, font: "Arial", size: 22 })] })],
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "LOCATION", bold: true, font: "Arial", size: 22 })] })],
                                    width: { size: 20, type: WidthType.PERCENTAGE },
                                    shading: { fill: "F3F4F6" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: inc.location, font: "Arial", size: 22 })] })],
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                }),
                            ]
                        }),
                        // Row 2
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "CATEGORY", bold: true, font: "Arial", size: 22 })] })],
                                    shading: { fill: "F3F4F6" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: inc.type, font: "Arial", size: 22 })] })],
                                }),
                                new TableCell({
                                    children: [new Paragraph({ children: [new TextRun({ text: "SEVERITY", bold: true, font: "Arial", size: 22 })] })],
                                    shading: { fill: "F3F4F6" }
                                }),
                                new TableCell({
                                    children: [new Paragraph({ 
                                        children: [new TextRun({ text: inc.severity, bold: true, color: inc.severity === "Critical" ? "FF0000" : "000000", font: "Arial", size: 22 })] 
                                    })],
                                }),
                            ]
                        }),
                        // Row 3: Narrative Header
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ children: [new TextRun({ text: "INCIDENT DETAILS / NARRATIVE", bold: true, font: "Arial", size: 22 })] })],
                                    shading: { fill: "E5E7EB" }
                                })
                            ]
                        }),
                        // Row 4: Narrative Body
                        new TableRow({
                            height: { value: 1440, rule: HeightRule.ATLEAST },
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ children: [new TextRun({ text: inc.description, font: "Arial", size: 22 })] })],
                                    verticalAlign: VerticalAlign.TOP,
                                })
                            ]
                        }),
                        // Row 5: Actions
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ children: [new TextRun({ text: "IMMEDIATE ACTIONS TAKEN", bold: true, font: "Arial", size: 22 })] })],
                                    shading: { fill: "E5E7EB" }
                                })
                            ]
                        }),
                        // Row 6: Actions Body
                        new TableRow({
                            height: { value: 720, rule: HeightRule.ATLEAST },
                            children: [
                                new TableCell({
                                    columnSpan: 4,
                                    children: [new Paragraph({ children: [new TextRun({ text: inc.actionsTaken || "None recorded.", font: "Arial", size: 22 })] })],
                                    verticalAlign: VerticalAlign.TOP,
                                })
                            ]
                        }),
                        // Row 7: Signoff
                        new TableRow({
                            children: [
                                new TableCell({
                                    columnSpan: 2,
                                    children: [new Paragraph({ children: [new TextRun({ text: `Reported By: ${inc.reportedBy}`, bold: true, font: "Arial", size: 22 })] })],
                                }),
                                new TableCell({
                                    columnSpan: 2,
                                    children: [new Paragraph({ 
                                        children: [new TextRun({ text: `Status: ${inc.status}`, bold: true, font: "Arial", size: 22 })],
                                        alignment: AlignmentType.RIGHT
                                    })],
                                }),
                            ]
                        })
                    ]
                })
            ];
        }).flat();

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "Arial", size: 22, color: COLOR_BLACK },
                    },
                },
            },
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: [
                    ...incidentTables,
                    ...signature
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Incident_Log_${new Date().toISOString().split('T')[0]}.docx`);
    }
};
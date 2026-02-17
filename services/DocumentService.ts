
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
import { OrganizationProfile, Animal, Incident, User, SiteLogEntry } from "../types";

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

    // --- REPORT: ROUNDS CHECKLIST (NEW) ---
    generateDailyRoundsChecklist: async (logs: SiteLogEntry[], animals: Animal[], users: User[], profile: OrganizationProfile | null, dateRangeText: string, currentUser: User | null, reportTitle: string = "ROUNDS CHECKLIST") => {
        const header = await DocumentService.createHeader(profile, reportTitle, dateRangeText);
        
        // Group logs by Date -> Section
        const groups: Record<string, Record<string, { am?: SiteLogEntry, pm?: SiteLogEntry }>> = {};
        
        logs.forEach(l => {
            let data: any = {};
            try { data = JSON.parse(l.description); } catch(e) { return; }
            
            const d = l.date; // YYYY-MM-DD
            const s = data.section;
            if (!groups[d]) groups[d] = {};
            if (!groups[d][s]) groups[d][s] = {};
            
            if (data.type === 'Morning') groups[d][s].am = l;
            if (data.type === 'Evening') groups[d][s].pm = l;
        });

        const docChildren: any[] = [];

        // Helper to get signature for a specific log
        const getSignatureForLog = async (log?: SiteLogEntry) => {
            if (!log) return null;
            let data: any = {};
            try { data = JSON.parse(log.description); } catch(e) { return null; }
            
            const userId = data.userId;
            const signer = users.find(u => u.id === userId);
            
            if (!signer || !signer.signature) return null;
            
            const buffer = await urlToBuffer(signer.signature);
            if (buffer) {
                return new ImageRun({
                    data: buffer,
                    transformation: { width: 80, height: 35 }, // Slightly smaller for inline flow
                    type: "png"
                });
            }
            return null;
        };

        // Iterate Groups
        for (const dateKey of Object.keys(groups).sort().reverse()) {
            for (const sectionKey of Object.keys(groups[dateKey])) {
                const group = groups[dateKey][sectionKey];
                const amData = group.am ? JSON.parse(group.am.description) : null;
                const pmData = group.pm ? JSON.parse(group.pm.description) : null;
                
                const sectionAnimals = animals.filter(a => a.category === sectionKey && !a.archived);
                
                // Signatures & Metadata
                const amSig = await getSignatureForLog(group.am);
                const pmSig = await getSignatureForLog(group.pm);
                
                const amTime = group.am ? new Date(group.am.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
                const pmTime = group.pm ? new Date(group.pm.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
                
                const amInitials = amData?.signedBy || "";
                const pmInitials = pmData?.signedBy || "";

                // Section Header
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${new Date(dateKey).toLocaleDateString('en-GB')} - ${sectionKey.toUpperCase()}`, bold: true, size: 28, font: "Arial" })
                        ],
                        spacing: { before: 400, after: 200 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "CCCCCC" } }
                    })
                );

                // Table Header
                const tableRows = [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Animal", bold: true, size: 20, color: "FFFFFF" })] })], shading: { fill: "1F2937" }, width: { size: 20, type: WidthType.PERCENTAGE } }),
                            
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AM Well", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AM Water", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AM Sec", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PM Well", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PM Water", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PM Sec", bold: true, size: 16, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1F2937" }, width: { size: 7, type: WidthType.PERCENTAGE } }),
                            
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Comments", bold: true, size: 18, color: "FFFFFF" })] })], shading: { fill: "1F2937" }, width: { size: 38, type: WidthType.PERCENTAGE } }),
                        ]
                    })
                ];

                // Animal Rows
                sectionAnimals.forEach(animal => {
                    const amCheck = amData?.details?.[animal.id];
                    const pmCheck = pmData?.details?.[animal.id];

                    const tick = "✓";
                    
                    // Aggregate notes
                    const notesParts = [];
                    if (amCheck?.healthIssue) notesParts.push(`AM Health: ${amCheck.healthIssue}`);
                    if (amCheck?.securityIssue) notesParts.push(`AM Sec: ${amCheck.securityIssue}`);
                    if (pmCheck?.healthIssue) notesParts.push(`PM Health: ${pmCheck.healthIssue}`);
                    if (pmCheck?.securityIssue) notesParts.push(`PM Sec: ${pmCheck.securityIssue}`);
                    
                    const notesStr = notesParts.join('; ');
                    
                    tableRows.push(
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: animal.name, style: "default" })] }),
                                new TableCell({ children: [new Paragraph({ text: amCheck?.isAlive ? tick : "", alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: amCheck?.isWatered ? tick : "", alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: (amCheck?.isSecure || amCheck?.securityIssue) ? tick : "", alignment: AlignmentType.CENTER })] }),
                                
                                new TableCell({ children: [new Paragraph({ text: pmCheck?.isAlive ? tick : "", alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: pmCheck?.isWatered ? tick : "", alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: (pmCheck?.isSecure || pmCheck?.securityIssue) ? tick : "", alignment: AlignmentType.CENTER })] }),
                                
                                new TableCell({ children: [new Paragraph({ text: notesStr, size: 16 })] }),
                            ]
                        })
                    );
                });

                docChildren.push(
                    new Table({
                        rows: tableRows,
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    })
                );

                // Signatures Row (Updated Format)
                const sigRow = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NIL }, bottom: { style: BorderStyle.NIL }, left: { style: BorderStyle.NIL }, right: { style: BorderStyle.NIL }, insideVertical: { style: BorderStyle.NIL }, insideHorizontal: { style: BorderStyle.NIL } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ 
                                            children: [
                                                new TextRun({ text: "AM - ", bold: true, size: 20 }),
                                                ...(amSig ? [amSig] : [new TextRun({ text: "(No Sig) ", italics: true, size: 16 })]),
                                                new TextRun({ text: `  (${amInitials})  ${amTime}`, size: 20, bold: true })
                                            ],
                                            alignment: AlignmentType.LEFT
                                        })
                                    ],
                                    width: { size: 50, type: WidthType.PERCENTAGE }
                                }),
                                new TableCell({
                                    children: [
                                        new Paragraph({ 
                                            children: [
                                                new TextRun({ text: "PM - ", bold: true, size: 20 }),
                                                ...(pmSig ? [pmSig] : [new TextRun({ text: "(No Sig) ", italics: true, size: 16 })]),
                                                new TextRun({ text: `  (${pmInitials})  ${pmTime}`, size: 20, bold: true })
                                            ],
                                            alignment: AlignmentType.RIGHT
                                        })
                                    ],
                                    width: { size: 50, type: WidthType.PERCENTAGE }
                                })
                            ]
                        })
                    ]
                });
                
                docChildren.push(new Paragraph({ text: "", spacing: { before: 100 } }));
                docChildren.push(sigRow);
                docChildren.push(new Paragraph({ text: "", spacing: { after: 400 } })); // Spacer between sections
            }
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "Arial", size: 20, color: COLOR_BLACK },
                    },
                },
            },
            sections: [{
                headers: { default: header },
                properties: { page: { margin: MARGINS } },
                children: docChildren,
            }],
        });

        const blob = await Packer.toBlob(doc);
        FileSaver.saveAs(blob, `Daily_Rounds_Checklist_${new Date().toISOString().split('T')[0]}.docx`);
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

    // --- REPORT: ROUNDS & CHECKS ---
    generateRoundsLog: async (logs: any[], profile: OrganizationProfile | null, dateRangeText: string, currentUser?: User | null, reportTitle: string = "ROUNDS & CHECKS") => {
        const header = await DocumentService.createHeader(profile, reportTitle, dateRangeText);
        const signature = await DocumentService.createSignatureBlock(currentUser);

        const tableRows = [
            new TableRow({
                tableHeader: true,
                children: ["Date/Time", "Round", "Section", "Officer", "Audit", "Status", "Notes"].map(text => 
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "FFFFFF" })] })],
                        shading: { fill: "1F2937" },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 }
                    })
                ),
            }),
            ...logs.map(l => {
                const hasIssue = l.status.includes('ISSUES');
                return new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.timestamp, size: 20, font: "Arial" })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.type, bold: true, size: 22, font: "Arial" })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.section, size: 22, font: "Arial" })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.staff || "-", size: 22, font: "Arial" })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.completion, size: 22, font: "Arial" })] })] }),
                        new TableCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text: l.status, bold: true, size: 22, font: "Arial", color: hasIssue ? "FF0000" : "000000" })] })] 
                        }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: l.notes || "-", size: 20, font: "Arial", italics: true })] })] }),
                    ]
                });
            })
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
        FileSaver.saveAs(blob, `Rounds_Log_${new Date().toISOString().split('T')[0]}.docx`);
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

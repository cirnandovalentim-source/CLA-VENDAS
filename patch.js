const fs = require('fs');
let code = fs.readFileSync('components/FichaModal.tsx', 'utf8');

const oldPrintLogic = `        // 2. Render extras
        const positions = [
            { x: 110, y: 10 },
            { x: 10, y: 140 },
            { x: 110, y: 140 }
        ];

        for (let i = 0; i < selectedExtraSales.length; i++) {
            const sid = selectedExtraSales[i];
            const elExtra = document.getElementById(\`ficha-content-extra-\${sid}\`);
            if (elExtra) {
                const canvas = await html2canvas(elExtra, { scale: 3, useCORS: true, logging: false, backgroundColor: "#ffffff" });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', positions[i].x, positions[i].y, 90, 120);
            }
        }`;

const newPrintLogic = `        // 2. Render extras
        const positions = [
            { x: 110, y: 10 },
            { x: 10, y: 140 },
            { x: 110, y: 140 }
        ];

        if (print4) {
            // Fill positions with selected extra sales
            for (let i = 0; i < 3; i++) {
                const sid = selectedExtraSales[i];
                let imgDataToDraw = null;
                
                if (sid) {
                    const elExtra = document.getElementById(\`ficha-content-extra-\${sid}\`);
                    if (elExtra) {
                        const canvas = await html2canvas(elExtra, { scale: 3, useCORS: true, logging: false, backgroundColor: "#ffffff" });
                        imgDataToDraw = canvas.toDataURL('image/png');
                    }
                } else if (elPrimary) {
                    // If no extra sale selected for this slot, use the primary image (copies)
                    const canvas = await html2canvas(elPrimary, { scale: 3, useCORS: true, logging: false, backgroundColor: "#ffffff" });
                    imgDataToDraw = canvas.toDataURL('image/png');
                }
                
                if (imgDataToDraw) {
                    pdf.addImage(imgDataToDraw, 'PNG', positions[i].x, positions[i].y, 90, 120);
                }
            }
        }`;

code = code.replace(oldPrintLogic, newPrintLogic);
fs.writeFileSync('components/FichaModal.tsx', code);

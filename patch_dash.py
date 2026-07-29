import os

with open('pages/Dashboard.tsx', 'r') as f:
    code = f.read()

import_statement = "import { useTheme, PrimaryColor } from '../contexts/ThemeContext';"
new_import = import_statement + "\nimport { BatchFichaModal } from '../components/BatchFichaModal';"
code = code.replace(import_statement, new_import)

state_decl = "const [valuesVisible, setValuesVisible] = useState(true);"
new_state_decl = state_decl + "\n  const [batchModalOpen, setBatchModalOpen] = useState(false);"
code = code.replace(state_decl, new_state_decl)

button_code = """                <button 
                   onClick={() => navigate(ROUTES.CLIENTS)}
                   className="bg-white border border-gray-200 dark:bg-[#2A2A2A] dark:border-[#333] text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                   {ICONS.Clients} Clientes
                </button>
             </div>"""
             
new_button_code = """                <button 
                   onClick={() => navigate(ROUTES.CLIENTS)}
                   className="bg-white border border-gray-200 dark:bg-[#2A2A2A] dark:border-[#333] text-gray-700 dark:text-gray-200 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                   {ICONS.Clients} Clientes
                </button>
             </div>
             
             <div className="mt-3">
                <button 
                   onClick={() => setBatchModalOpen(true)}
                   className="w-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100 transition-colors"
                >
                   {ICONS.Printer} Imprimir Fichas em Lote
                </button>
             </div>"""

code = code.replace(button_code, new_button_code)

end_code = "    </div>\n  );\n};"
new_end_code = "      <BatchFichaModal isOpen={batchModalOpen} onClose={() => setBatchModalOpen(false)} />\n    </div>\n  );\n};"

code = code.replace(end_code, new_end_code)

with open('pages/Dashboard.tsx', 'w') as f:
    f.write(code)

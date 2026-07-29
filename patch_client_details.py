import os
import re

with open('pages/ClientDetails.tsx', 'r') as f:
    code = f.read()

# Add a state for ClientFichaModal
state_decl = "const [isFichaOpen, setIsFichaOpen] = useState(false);"
new_state_decl = state_decl + "\n  const [isClientFichaOpen, setIsClientFichaOpen] = useState(false);"
code = code.replace(state_decl, new_state_decl)

# Add top level action buttons under the Card grid
cards_grid = """        <div className="grid grid-cols-2 gap-4">
           <Card className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Total Comprado</p>
              <p className="text-gray-900 dark:text-white font-bold text-lg">R$ {totalBought.toFixed(2)}</p>
           </Card>
           <Card className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Resta a Receber</p>
              <p className="text-brand-primary font-bold text-lg">R$ {totalDebt.toFixed(2)}</p>
           </Card>
        </div>"""

new_buttons = """        <div className="flex gap-2">
           <button 
               onClick={() => {
                   const pending = allInstallments.filter(i => !i.pago).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
                   if (pending.length > 0) {
                       handleOpenPay(pending[0]);
                   } else {
                       alert("Não há parcelas pendentes para este cliente.");
                   }
               }}
               className="flex-1 bg-brand-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-brand-primary/90 transition-colors"
           >
               {ICONS.Payments} Receber Pagamento
           </button>
           <button 
               onClick={() => setIsClientFichaOpen(true)}
               className="flex-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100 transition-colors"
           >
               {ICONS.Printer} Imprimir Ficha Completa
           </button>
        </div>"""

code = code.replace(cards_grid, cards_grid + "\n\n" + new_buttons)

# Import ClientFichaModal
import_statement = "import { FichaModal } from '../components/FichaModal';"
new_import_statement = import_statement + "\nimport { ClientFichaModal } from '../components/ClientFichaModal';"
code = code.replace(import_statement, new_import_statement)

# Add ClientFichaModal inside the return
end_modals = "</Modal>"
new_end_modals = "</Modal>\n\n      <ClientFichaModal isOpen={isClientFichaOpen} onClose={() => setIsClientFichaOpen(false)} client={client} sales={sales} installments={allInstallments} />"

# I want to add it right before the last closing div of the return, let's just find `</Modal>` in the code, actually there are multiple Modals.
# Let's insert it before the last `    </div>\n  );`
code = code.replace("    </div>\n  );\n};", "      <ClientFichaModal isOpen={isClientFichaOpen} onClose={() => setIsClientFichaOpen(false)} client={client} sales={sales} installments={allInstallments} />\n    </div>\n  );\n};")


# Update the 'Pagar' button in installments to have text
pay_btn_old = """<button onClick={() => handleOpenPay(inst)} className="p-1.5 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                                            {ICONS.Check}
                                         </button>"""
pay_btn_new = """<button onClick={() => handleOpenPay(inst)} className="px-2 py-1.5 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-1 font-bold text-xs bg-green-50 dark:bg-green-900/10">
                                            {ICONS.Check} Pagar
                                         </button>"""
code = code.replace(pay_btn_old, pay_btn_new)


with open('pages/ClientDetails.tsx', 'w') as f:
    f.write(code)

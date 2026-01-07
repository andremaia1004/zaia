'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Upload, FileText, Check, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import { clientService } from '@/services/clients'
import { professionalService } from '@/services/professionals'
import { appointmentService } from '@/services/appointments'
import type { Client, Professional } from '@/services/types'
import { format, parse } from 'date-fns'

interface ImportClientsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type CSVRow = {
    'Data da consulta': string
    'Nome': string
    'Telefone': string
    'Profissional': string
}

export function ImportClientsModal({ isOpen, onClose, onSuccess }: ImportClientsModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [totalRows, setTotalRows] = useState(0)
    const [processed, setProcessed] = useState(0)
    const [errors, setErrors] = useState<string[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0])
            setErrors([])
            setProcessed(0)

            // Preview count
            Papa.parse(e.target.files[0], {
                header: true,
                complete: (results) => {
                    setTotalRows(results.data.length)
                }
            })
        }
    }

    const processImport = async () => {
        if (!file) return
        setIsProcessing(true)
        setErrors([])
        setProcessed(0)

        Papa.parse<CSVRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let count = 0
                const errs: string[] = []

                for (const [index, row] of results.data.entries()) {
                    try {
                        // 1. Validation
                        if (!row['Nome'] || !row['Data da consulta']) {
                            continue // Skip empty or invalid
                        }

                        // 2. Resolve Client (Deduplicate by Phone)
                        let client = await clientService.getByPhone(row['Telefone'])
                        if (!client) {
                            // If phone is missing, we might create always or skip. Assuming phone is key.
                            if (!row['Telefone']) {
                                // Fallback: Create just with name if allowed, but requirement said deduplicate by phone.
                                // Let's create with random/empty phone if needed, but 'Telefone' is required in my earlier schema?
                                // Schema: phone TEXT NOT NULL UNIQUE. So we must have phone.
                                throw new Error(`Linha ${index + 1}: Telefone obrigatório.`)
                            }
                            client = await clientService.create({
                                name: row['Nome'],
                                phone: row['Telefone']
                            })
                        }

                        // 3. Resolve Professional
                        let professional = await professionalService.findByName(row['Profissional'])
                        if (!professional) {
                            // Create if not exists
                            professional = await professionalService.create({
                                name: row['Profissional'] || 'Profissional Desconhecido',
                                role: 'Consultor',
                                active: true
                            })
                        }

                        // 4. Create Appointment
                        // Parse Date: assumes 'DD/MM/YYYY' or 'YYYY-MM-DD'
                        let dateStr: string | null = null
                        if (row['Data da consulta'].includes('/')) {
                            // simple parse DD/MM/YYYY
                            const parts = row['Data da consulta'].split('/')
                            if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
                        } else {
                            dateStr = row['Data da consulta']
                        }

                        if (dateStr) {
                            await appointmentService.create({
                                date: dateStr,
                                client_id: client?.id,
                                professional_id: professional?.id,
                                status: 'COMPARECEU', // Taking a guess for historical data
                                result: 'NAO_DEFINIDO',
                                origin: 'Importação'
                            })
                        }

                        count++
                        setProcessed(count)

                    } catch (err: any) {
                        console.error(err)
                        errs.push(`Erro linha ${index + 1}: ${err.message || 'Falha ao processar'}`)
                    }
                }

                setErrors(errs)
                setIsProcessing(false)
                if (errs.length < results.data.length) onSuccess()
            }
        })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Planilha">
            <div className="space-y-6">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5 text-sm text-slate-300">
                    <p className="font-semibold text-white mb-2">Instruções:</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li>O arquivo deve ser <b>.csv</b></li>
                        <li>Colunas obrigatórias (cabeçalho exato): <br />
                            <code className="text-xs bg-slate-900 p-1 rounded">Data da consulta, Nome, Telefone, Profissional</code>
                        </li>
                    </ul>
                </div>

                {!file ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-slate-400" />
                            <p className="text-sm text-slate-500">Clique para selecionar CSV</p>
                        </div>
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                    </label>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-3">
                            <FileText className="text-zaia-400" />
                            <div>
                                <p className="text-sm text-white font-medium">{file.name}</p>
                                <p className="text-xs text-slate-400">{totalRows} linhas detectadas</p>
                            </div>
                        </div>
                        <button onClick={() => setFile(null)} className="text-xs text-red-400 hover:text-red-300">Remover</button>
                    </div>
                )}

                {errors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg max-h-32 overflow-y-auto">
                        <p className="text-red-400 text-xs font-bold mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Erros ({errors.length})
                        </p>
                        {errors.map((e, i) => (
                            <p key={i} className="text-red-400/80 text-[10px]">{e}</p>
                        ))}
                    </div>
                )}

                {isProcessing && (
                    <div className="space-y-2">
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-zaia-500 transition-all duration-300"
                                style={{ width: `${(processed / totalRows) * 100}%` }}
                            />
                        </div>
                        <p className="text-xs text-center text-slate-400">Processando {processed} de {totalRows}...</p>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={processImport}
                        disabled={!file || isProcessing}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? 'Importando...' : 'Iniciar Importação'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}

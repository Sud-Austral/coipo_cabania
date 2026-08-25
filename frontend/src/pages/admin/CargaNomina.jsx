import { useState } from 'react'
import { Upload } from 'lucide-react'
import { importarNomina } from '../../api/administracion.js'
import { useRol } from '../../context/RolContext.jsx'
import { Aviso, Boton, Campo, Tarjeta, TituloSeccion, clasesInput } from '../../components/ui/Elementos.jsx'

const ejemplo='rut,nombre,correo,estado\n13.457.902-8,María Fuentes Rojas,maria.fuentes@conaf.cl,vigente'
const leer=(texto)=>{const lineas=texto.trim().split(/\r?\n/).filter(Boolean);if(lineas.length<2)return[];const cab=lineas[0].split(/[,;]/).map((x)=>x.trim().toLowerCase());return lineas.slice(1).map((l)=>{const v=l.split(/[,;]/).map((x)=>x.trim());return Object.fromEntries(cab.map((c,i)=>[c,v[i]||'']))})}

export function CargaNomina(){const {actor}=useRol();const [texto,setTexto]=useState(ejemplo);const [resultado,setResultado]=useState(null);const [error,setError]=useState('')
 const procesar=async()=>{setError('');const filas=leer(texto);if(!filas.length)return setError('Incluya encabezados y al menos una fila.');try{setResultado(await importarNomina(filas,actor))}catch(e){setError(e.detail||e.message)}}
 const archivo=async(e)=>{const f=e.target.files?.[0];if(f)setTexto(await f.text())}
 return <><TituloSeccion titulo="Carga de nómina de afiliados" descripcion="Importe un CSV, valide filas obligatorias y duplicadas, y registre el resultado en el historial y auditoría." />{error&&<div className="mb-4"><Aviso tono="rojo">{error}</Aviso></div>}{resultado&&<div className="mb-4"><Aviso tono={resultado.errores.length?'ambar':'verde'} titulo="Carga procesada">{resultado.validas} filas válidas de {resultado.total}. {resultado.errores.length} errores.</Aviso></div>}<Tarjeta className="p-5"><Campo etiqueta="Archivo CSV" ayuda="Columnas mínimas: rut,nombre"><input type="file" accept=".csv,text/csv" onChange={archivo} className={clasesInput}/></Campo><Campo etiqueta="Vista previa y edición" className="mt-4"><textarea rows="12" value={texto} onChange={(e)=>setTexto(e.target.value)} className={`${clasesInput} font-mono`}/></Campo><div className="mt-4"><Boton onClick={procesar}><Upload size={16}/>Validar e importar</Boton></div>{resultado?.errores.length>0&&<ul className="mt-4 list-disc pl-5 text-sm text-rose-700">{resultado.errores.map((x)=><li key={`${x.fila}-${x.error}`}>Fila {x.fila}: {x.error}</li>)}</ul>}</Tarjeta></>}

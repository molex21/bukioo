export async function loadScheduleEmployeeVersions(ids: string[],load: (id:string)=>Promise<{id:string;version:number}|undefined>): Promise<Record<string,number>> {
  const unique=[...new Set(ids)];
  if(unique.length>50)throw new Error("Selecciona como máximo 50 empleados.");
  const entries=await Promise.all(unique.map(async(id)=>{
    const employee=await load(id);
    if(!employee||employee.id!==id||!Number.isInteger(employee.version)||employee.version<0)throw new Error("El equipo ha cambiado. Actualiza antes de asignar la rotación.");
    return [id,employee.version] as const;
  }));
  return Object.fromEntries(entries);
}

# Gestor de Turnos Hospitalarios

Frontend MVP para programacion de turnos hospitalarios multi-tenant, enfocado en el rol de planificador.

## Estado actual

- Login mock por rol
- Centro de control del planificador
- Pantalla de programacion con drag and drop controlado
- Copiloto IA contextual
- Modulo de personas
- Modulo de reglas con catalogo base hospitalario
- Modulo de publicaciones con aprobacion, exportacion CSV y notificacion a empleados
- Vista de empleado con horario aprobado y notificaciones

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand
- TanStack Query
- React Hook Form
- Zod
- dnd-kit
- lucide-react

## Instalacion

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Usuarios mock

- `Laura Gomez · Planificador`
- `Mauricio Rojas · Admin institucional`
- `Sebastian Ortiz · Coordinador`
- `Paula Medina · Empleado`
- Accesos aparte: `Catalina Vega · Superadmin`, `Nicolas Cruz · Consulta`

## Rutas principales

- `Login`: `/login`
- `Centro de control`: `/planner/centro-control`
- `Programacion`: `/planner/programacion`
- `Novedades`: `/planner/novedades`
- `Personas`: `/planner/personas`
- `Reglas`: `/planner/reglas`
- `Publicaciones`: `/planner/publicaciones`
- `Mi horario`: `/empleado/mi-horario`
- `Tenants`: `/superadmin/tenants`

## Funcionalidades clave

### Programacion

- Asignacion manual con validacion mock por reglas
- Reasignacion y devolucion al pool
- Autoasignacion global
- Autoasignacion por dependencia hovered
- Scoring por candidato y riesgo por modulo

### Reglas

- Catalogo base con reglas duras y blandas
- Filtros por categoria, tipo y criticidad
- CRUD local para reglas editables

### Publicaciones

- Simulacion de publicacion
- Aprobacion de version
- Persistencia local de versiones y auditoria
- Exportacion CSV compatible con Excel
- Notificacion mock a empleados

## Estructura general

```text
src/
  app/
  features/
  pages/
  services/
  shared/
```

## Pendientes recomendados

- Restaurar una version historica al tablero actual
- Comparar versiones mostrando empleados agregados o removidos
- Deduplicar notificaciones por publicacion
- Conectar exportacion real a `.xlsx`
- Persistir datos en backend real
- Agregar manejo de errores con `errorElement` o `ErrorBoundary`

## Repositorio

- GitHub: `https://github.com/Whitefox9/gestor_turnos`

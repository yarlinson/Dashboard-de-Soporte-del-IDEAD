# Dashboard ETL — Campus Virtual Unillanos

Herramienta de ETL (Extract, Transform, Load) **100% client-side** para transformar exports del sistema académico
(SIAU) en archivos listos para la carga masiva en Moodle. Todo el procesamiento (lectura de Excel/CSV, validación,
transformación y exportación) ocurre en el navegador, en memoria: ningún dato institucional o de estudiantes sale
del equipo del administrador ni se envía a un backend.

## Requisitos

- Node.js `>=18.18` (probado con 18.19.1)
- pnpm `>=9`

## Cómo correr el proyecto localmente

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Convención de carpetas

```
src/
├── app/
│   ├── page.tsx                  # landing: lista los casos de uso ETL desde el registry
│   └── etl/<caso-de-uso>/        # una ruta por caso de uso ETL
├── components/
│   ├── ui/                       # primitivas shadcn/ui
│   └── etl/                      # componentes reutilizables (dropzone, tabla de previsualización, badges...)
│       └── <caso-de-uso>/        # componentes específicos de un caso de uso
└── lib/
    └── etl/
        ├── registry.ts           # lista de casos de uso ETL (alimenta la landing page)
        ├── core/                 # tipos y utilidades genéricas compartidas (Rule<T>, EtlIssue, lectura/escritura CSV)
        └── <caso-de-uso>/        # schema.ts, rules.ts, transform.ts puros — sin dependencias de React/DOM
```

### Añadir un nuevo caso de uso ETL

1. Crear `src/lib/etl/<caso>/{constants,schema,rules,transform}.ts` siguiendo el patrón de `siau-to-moodle/`.
2. Crear `src/components/etl/<caso>/` con el formulario de configuración y el workflow que orquesta subir → previsualizar → exportar.
3. Crear `src/app/etl/<caso>/page.tsx`.
4. Agregar una entrada en `src/lib/etl/registry.ts`.

Nada en `lib/etl/core/` necesita cambiar para soportar un nuevo caso de uso.

## Caso de uso actual: SIAU → Moodle

Transforma el export de SIAU (columnas `CÓDIGO_INSTITUCIONAL, NOMBRES, APELLIDOS, CORREO_INSTITUCIONAL, CURSOS, ...`)
al archivo de carga masiva de usuarios de Moodle (`username, password, firstname, lastname, email, course1, course2,
...`), exportable como CSV o como libro de Excel (`.xlsx`), con un sufijo de período académico configurable (ej.
`/2026B`) y una contraseña genérica para el lote. El `username` se genera a partir de `CÓDIGO_INSTITUCIONAL`, que es
el identificador que usa el campus virtual de Unillanos.

## Despliegue

Pensado para desplegarse en [Vercel](https://vercel.com) (plan Hobby). No requiere variables de entorno ni rutas de
API: es una app Next.js estándar cuyo build es efectivamente estático.

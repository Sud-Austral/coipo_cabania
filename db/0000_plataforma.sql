-- ============================================================================
-- 0000_plataforma.sql — EL ESQUEMA QUE TODA APP COIPO COMPARTE Y NINGUNA EDITA
-- ============================================================================
--
-- QUE ES ESTE ARCHIVO
-- -------------------
-- La parte de la base que no pertenece a ninguna aplicacion en particular: el catalogo
-- cerrado de eventos, los tres logs, la evidencia de que la retencion corrio, los
-- triggers que hacen que un log sea un log, la cadena hash y las funciones de purga.
-- Viaja CONGELADO en semilla/CONGELADO/ con su sha256 en semilla.lock. El job
-- `semilla-intacta` del CI falla si una app lo edita. El porque esta en el README.md
-- que acompaña a este archivo.
--
-- Lo de la app va en `db/0001_dominio.sql` y siguientes, y se aplica DESPUES: este
-- archivo es el 0000 del ledger de migraciones (D-15), con su SHA-256 registrado en
-- `(aplicacion, archivo)`. Editarlo despues de aplicado es un error ruidoso en el
-- arranque, no una divergencia silenciosa entre entornos.
--
-- QUE NO ES
-- ---------
-- No es un `schema.sql` monolitico y reejecutable. Que cada sentencia lleve
-- `IF NOT EXISTS` es una RED DE SEGURIDAD contra un doble arranque, no el mecanismo de
-- evolucion. El mecanismo es el ledger. La razon es D-15: un monolitico con
-- `IF NOT EXISTS` funciona en una base nueva y es un NO-OP INVISIBLE en produccion —
-- el desarrollador ve su cambio, el CI pasa, el deploy sale verde y la columna no
-- existe en el servidor. Por eso el archivo termina con un bloque de VERIFICACION DE
-- FORMA que convierte ese no-op silencioso en un `RAISE EXCEPTION`.
--
-- LOS TRES CERROJOS CONTRA INVENTAR UN EVENTO (D-20)
-- --------------------------------------------------
--   1. La aplicacion no puede pasar un string: `registrar()` recibe un objeto `Evento`
--      congelado, generado desde catalogos/eventos.yaml.
--   2. ESTE ARCHIVO: `catalogo_evento` es una tabla y `log_auditoria.accion` es una
--      CLAVE FORANEA REAL contra su PK. Un evento inventado no se documenta: falla el
--      INSERT.
--   3. El juez j04 recorre el AST y falla si el primer argumento de `registrar*` es una
--      constante literal, si el catalogo y la tabla difieren, o si un `campos_detalle`
--      declara una clave que esta en CAMPOS_PII.
-- Tres cerrojos independientes porque el fallo medido no fue un descuido puntual: hoy
-- hay TRES vocabularios en produccion (`auth.iam_callback`, `LOGIN_OK`, `LOGIN_SUCCESS`)
-- que son el mismo evento, en TRES esquemas de tabla distintos.
--
-- EL LIMITE, DICHO ANTES DE QUE LO DESCUBRAN
-- ------------------------------------------
-- Los triggers de inmutabilidad protegen de la APLICACION y de un error humano. NO
-- protegen de quien administre el Postgres: 172.31.2.40 es un servidor COMPARTIDO que
-- opera otro equipo, y quien tiene ese rol puede hacer `ALTER TABLE ... DISABLE TRIGGER`.
-- Lo que hace detectable una alteracion no es el trigger: es el SELLO DIARIO commiteado
-- a docs/cumplimiento/sellos/AAAA-MM.jsonl desde el runner, que vive en GitHub, fuera
-- del alcance del DBA, con fecha, autor y un SHA que depende de todo el historial.
-- Una cadena hash sin ancla externa es criptografia por deporte, y va escrito.
-- Ver docs/CUADERNO_DE_AUDITORIA.md C-4 y docs/ADVERSARIAL.md A-07.
--
-- LA FUNCION HASH: RIESGO DECLARADO Y COMO SE RESOLVIO
-- ---------------------------------------------------
-- El diseño previo asumia `CREATE EXTENSION pgcrypto`, que en la mayoria de las
-- instalaciones EXIGE SUPERUSUARIO. Si el DBA lo niega, el plan B es calcular el hash en
-- Python, y entonces LA CADENA ES FORJABLE POR LA PROPIA APLICACION: deja de ser un
-- control y pasa a ser un adorno.
--
-- Este archivo evita ese callejon: PostgreSQL trae `sha256(bytea)` en el nucleo desde la
-- version 11, sin extension y sin superusuario, y produccion corre 17.10. Con eso, la
-- ficha de DEUDA por pgcrypto NO se abre. El archivo mantiene igualmente las dos rutas
-- de respaldo (pgcrypto y, en ultimo caso, el plan B degradado) porque una afirmacion
-- sobre el servidor real no se da por cierta sin haberla corrido contra el servidor real
-- — y quien escribio este archivo no pudo hacerlo. La comprobacion es una linea:
--
--     psql "$DATABASE_URL" -c "SELECT encode(sha256('x'::bytea),'hex');"
--
-- Si esa linea responde, la cadena la calcula la base y `log_auditoria.hash_origen` dice
-- 'base' en todas las filas. Si no responde, el bloque de capacidad de mas abajo deja el
-- modo en 'aplicacion', el test `test_el_hash_lo_calcula_la_base_no_la_aplicacion` queda
-- ROJO y se abre la ficha en DEUDA.md. La degradacion es visible en un SELECT, que es lo
-- unico que la hace honesta:
--
--     SELECT count(*) FROM log_auditoria WHERE hash_origen <> 'base';   -- debe ser 0
--
-- IDIOMA Y CONVENCIONES
-- ---------------------
-- Espanol, snake_case, sin acentos en identificadores (D-01, D-02). Los comentarios SI
-- llevan acentos donde corresponde. Toda columna lleva `COMMENT ON COLUMN` con
-- encabezado cerrado y parseable — es lo que permite que un auditor saque el inventario
-- de datos personales con `psql` sobre information_schema + pg_description, sin leer una
-- linea de Python y sin confiar en nosotros (docs/CUADERNO_DE_AUDITORIA.md C-5).
-- ============================================================================


-- ============================================================================
-- 1. CAPACIDAD CRIPTOGRAFICA DE LA BASE
-- ============================================================================

-- Registro de lo que la base PUEDE hacer, decidido una vez al aplicar la migracion y
-- consultable despues. Existe para que la degradacion sea un dato consultable y no una
-- suposicion: "creo que el DBA nos dio pgcrypto" no es evidencia.
CREATE TABLE IF NOT EXISTS plataforma_capacidad (
    clave        text PRIMARY KEY,
    valor        text        NOT NULL,
    detectado_en timestamptz NOT NULL DEFAULT now(),
    nota         text
);

COMMENT ON TABLE plataforma_capacidad IS
    'Capacidades detectadas del motor al aplicar 0000_plataforma.sql. Sin datos personales.';
COMMENT ON COLUMN plataforma_capacidad.clave IS
    'CLASIF: tec | finalidad=declarar_capacidades_del_motor | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN plataforma_capacidad.valor IS
    'CLASIF: tec | finalidad=declarar_capacidades_del_motor | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN plataforma_capacidad.detectado_en IS
    'CLASIF: tec | finalidad=fechar_la_deteccion | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN plataforma_capacidad.nota IS
    'CLASIF: tec | finalidad=explicar_la_capacidad_detectada | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';

-- Se elige la implementacion de SHA-256 en ESTE orden y se deja escrito cual quedo.
--
-- Por que NO se pide pgcrypto cuando el nucleo ya sabe hacer sha256: pedir una extension
-- que exige superusuario a un DBA que no es del equipo, para obtener algo que ya se
-- tiene, es gastar la unica peticion que quiza nos concedan. Y una dependencia que no
-- hace falta es una dependencia que algun dia falta.
DO $capacidad$
DECLARE
    v_modo text;
    v_nota text;
BEGIN
    IF to_regprocedure('pg_catalog.sha256(bytea)') IS NOT NULL THEN
        v_modo := 'base';
        v_nota := 'sha256(bytea) del nucleo de PostgreSQL (>= 11). Sin extension, sin superusuario.';
        EXECUTE $sql$
            CREATE OR REPLACE FUNCTION fn_sha256_hex(p_texto text) RETURNS text
            LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
            $cuerpo$
                SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_texto, 'UTF8')), 'hex')
            $cuerpo$;
        $sql$;

    ELSE
        -- Motor sin sha256 nativo (PostgreSQL < 11, o una compilacion recortada). Se
        -- intenta pgcrypto, sabiendo que lo normal es que lo niegue por privilegios.
        BEGIN
            EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
        EXCEPTION WHEN insufficient_privilege OR undefined_file OR undefined_object THEN
            RAISE NOTICE 'pgcrypto no disponible (%): se evalua el plan B', SQLERRM;
        END;

        IF to_regprocedure('digest(bytea,text)') IS NOT NULL THEN
            v_modo := 'base';
            v_nota := 'digest() de pgcrypto. El nucleo de este motor no trae sha256().';
            EXECUTE $sql$
                CREATE OR REPLACE FUNCTION fn_sha256_hex(p_texto text) RETURNS text
                LANGUAGE sql IMMUTABLE STRICT AS
                $cuerpo$
                    SELECT encode(digest(convert_to(p_texto, 'UTF8'), 'sha256'), 'hex')
                $cuerpo$;
            $sql$;
        ELSE
            -- PLAN B. Queda escrito lo que significa, para que nadie lo lea como un
            -- detalle de implementacion: la cadena la calcula la aplicacion, y por lo
            -- tanto LA APLICACION PUEDE FORJARLA. Es una limitacion declarada, no un
            -- control. Ficha obligatoria en DEUDA.md y test en rojo.
            v_modo := 'aplicacion';
            v_nota := 'DEGRADADO: ni sha256() del nucleo ni pgcrypto. La cadena la calcula '
                   || 'la aplicacion y ES FORJABLE POR ELLA. Abrir ficha en DEUDA.md; el test '
                   || 'test_el_hash_lo_calcula_la_base_no_la_aplicacion queda ROJO.';
            EXECUTE $sql$
                CREATE OR REPLACE FUNCTION fn_sha256_hex(p_texto text) RETURNS text
                LANGUAGE plpgsql IMMUTABLE AS
                $cuerpo$
                BEGIN
                    RAISE EXCEPTION 'fn_sha256_hex: este motor no puede calcular SHA-256 '
                                    '(ni sha256() del nucleo ni pgcrypto). Ver plataforma_capacidad.';
                END;
                $cuerpo$;
            $sql$;
            RAISE WARNING '%', v_nota;
        END IF;
    END IF;

    INSERT INTO plataforma_capacidad (clave, valor, nota)
    VALUES ('hash_de_auditoria', v_modo, v_nota)
    ON CONFLICT (clave) DO UPDATE
        SET valor = EXCLUDED.valor, nota = EXCLUDED.nota, detectado_en = now();
END;
$capacidad$;

COMMENT ON FUNCTION fn_sha256_hex(text) IS
    'SHA-256 hexadecimal de un texto UTF-8. La implementacion la elige el bloque de capacidad al aplicar la migracion; plataforma_capacidad dice cual quedo.';


-- ============================================================================
-- 2. catalogo_evento — EL CATALOGO CERRADO, MATERIALIZADO (D-20, cerrojo 2)
-- ============================================================================
--
-- Se siembra desde catalogos/eventos.yaml (mas catalogos/eventos-<app>.yaml del propio
-- repo) en el `lifespan`, ANTES del yield y dentro del mismo pg_advisory_lock del
-- arranque, con ON CONFLICT DO UPDATE. Si la siembra falla, el arranque falla
-- RUIDOSAMENTE, en vez de arrancar y escribir un log mudo.
--
-- Con la base recien creada esta tabla esta VACIA por definicion, y eso NO puede bajar
-- /health: seria el fallo que ya se recorrio y se revirtio en
-- COIPO_ENTREGA_PLANTA/backend/app/routers/health.py:36-40 ("un 503 aca dejaria el sitio
-- entero sin arrancar por un problema de datos"). El catalogo vacio es un fallo de DATOS
-- y vive en /health/detalle, que ninguna sonda usa y que lee el smoke test del despliegue:
-- build ROJO, sitio ARRIBA.
CREATE TABLE IF NOT EXISTS catalogo_evento (
    -- El patron es el mismo string que PATRON_EVENTO en Python y que `patron:` en
    -- catalogos/eventos.yaml. Estar en tres sitios es deliberado y j04 los reconcilia:
    -- el de aqui es el unico que un INSERT no puede esquivar.
    codigo      text PRIMARY KEY
                CHECK (codigo ~ '^[a-z][a-z0-9_]{1,20}\.[a-z][a-z0-9_]{1,24}\.[a-z][a-z0-9_]{1,16}$'),

    clase       text NOT NULL
                CHECK (clase IN ('autenticacion','autorizacion','lectura','escritura',
                                 'exportacion','configuracion','proceso','administracion',
                                 'emergencia','retencion','sistema')),

    -- Ordena informes y alertas. NO decide comportamiento: eso lo decide `regimen`, y
    -- punto. Dos campos que ambos deciden lo mismo derivan el dia que alguien cambia uno.
    criticidad  text NOT NULL CHECK (criticidad IN ('baja','media','alta','critica')),

    -- Los cuatro regimenes de escritura (§5.4 del diseño). Vive en la base porque el
    -- regimen es parte del contrato del evento, y porque j04 compara tabla contra YAML.
    regimen     text NOT NULL
                CHECK (regimen IN ('ATOMICO','CRITICO','DEGRADADO','BEST_EFFORT')),

    -- Estrato de retencion. Las tres palabras son EXACTAMENTE las de catalogos/retencion.yaml:
    -- "tecnica" y no "tecnico". La deriva de vocabulario que este patron existe para
    -- deshacer empieza siempre asi, con la misma cosa nombrada de dos maneras.
    retencion   text NOT NULL CHECK (retencion IN ('tecnica','pii','acto')),

    -- Para que existe este evento. Tiene que aparecer tambien en el RAT; j04 lo compara
    -- contra proyecto.coipo.yaml.
    finalidad   text NOT NULL CHECK (length(btrim(finalidad)) >= 10),

    -- La base que sostiene CONSERVAR ESTE REGISTRO, no la del tratamiento de negocio que
    -- el evento describe. Son distintas, y confundirlas es como se llega a un RAT que
    -- declara consentimiento sobre un log que el titular no puede borrar.
    base_legal  text NOT NULL
                CHECK (base_legal IN ('consentimiento','cumplimiento_funciones_publicas',
                                      'obligacion_legal','ejecucion_contrato',
                                      'interes_vital','interes_legitimo')),

    -- Allowlist de claves de `detalle` (D-19). Se materializa aqui para que el juez j04
    -- pueda comparar YAML contra base sin ejecutar la app, y para que un auditor vea que
    -- claves puede contener el jsonb sin leer codigo.
    campos_detalle          text[] NOT NULL DEFAULT '{}',
    valores_cerrados        jsonb  NOT NULL DEFAULT '{}'::jsonb,
    exige_valores_previos   boolean NOT NULL DEFAULT false,

    version_catalogo        integer NOT NULL DEFAULT 1,

    -- UN EVENTO RETIRADO NO SE BORRA. Borrarlo rompe la FK de las filas historicas, que
    -- es exactamente lo que la FK existe para impedir: el codigo de una fila de 2027
    -- tiene que seguir resolviendo a su finalidad declarada en 2033, cuando el evento ya
    -- no se emita.
    retirado_en             timestamptz,
    motivo_retiro           text,

    creado_en               timestamptz NOT NULL DEFAULT now(),
    actualizado_en          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_catalogo_retiro_con_motivo
        CHECK (retirado_en IS NULL OR length(btrim(coalesce(motivo_retiro,''))) >= 10)
);

CREATE INDEX IF NOT EXISTS idx_catalogo_clase
    ON catalogo_evento (clase) WHERE retirado_en IS NULL;
CREATE INDEX IF NOT EXISTS idx_catalogo_retencion
    ON catalogo_evento (retencion);

COMMENT ON TABLE catalogo_evento IS
    'Catalogo cerrado de eventos de auditoria (D-20). Se siembra desde catalogos/eventos.yaml en el lifespan. log_auditoria.accion es FK contra codigo. Un evento retirado se marca, no se borra. Sin datos personales.';
COMMENT ON COLUMN catalogo_evento.codigo IS
    'CLASIF: dn | finalidad=identificar_el_tipo_de_evento | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628 | formato=<clase>.<entidad>.<verbo>';
COMMENT ON COLUMN catalogo_evento.clase IS
    'CLASIF: dn | finalidad=agrupar_eventos_para_consulta_y_retencion | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.criticidad IS
    'CLASIF: dn | finalidad=ordenar_informes_y_alertas | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628 | NO decide comportamiento: eso lo decide regimen';
COMMENT ON COLUMN catalogo_evento.regimen IS
    'CLASIF: dn | finalidad=decidir_que_pasa_si_falla_la_escritura_del_log | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.retencion IS
    'CLASIF: dn | finalidad=asignar_el_estrato_de_retencion | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | tecnica=90d pii=5a acto=6a';
COMMENT ON COLUMN catalogo_evento.finalidad IS
    'CLASIF: dn | finalidad=declarar_para_que_existe_el_evento | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | es la columna que el JOIN de C-1 le muestra al auditor';
COMMENT ON COLUMN catalogo_evento.base_legal IS
    'CLASIF: dn | finalidad=declarar_la_base_que_sostiene_conservar_el_registro | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.campos_detalle IS
    'CLASIF: dn | finalidad=allowlist_de_claves_del_jsonb_detalle | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628 | D-19';
COMMENT ON COLUMN catalogo_evento.valores_cerrados IS
    'CLASIF: dn | finalidad=enumerar_los_valores_permitidos_por_clave | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.exige_valores_previos IS
    'CLASIF: dn | finalidad=obligar_a_registrar_el_estado_anterior | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | REGLA CRUD-2';
COMMENT ON COLUMN catalogo_evento.version_catalogo IS
    'CLASIF: dn | finalidad=trazar_que_version_del_catalogo_quedo_vigente | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.retirado_en IS
    'CLASIF: dn | finalidad=retirar_un_evento_sin_romper_filas_historicas | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.motivo_retiro IS
    'CLASIF: dn | finalidad=explicar_por_que_se_retiro_el_evento | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.creado_en IS
    'CLASIF: dn | finalidad=fechar_el_alta_del_evento_en_el_catalogo | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN catalogo_evento.actualizado_en IS
    'CLASIF: dn | finalidad=fechar_la_ultima_resiembra | base=cumplimiento_funciones_publicas | retencion=permanente | trato=conservar_justificado | ley=19628';


-- ============================================================================
-- 3. log_auditoria — UNA FILA POR ACTO DE NEGOCIO CON SIGNIFICADO
-- ============================================================================
--
-- Volumen propio: ~15-30 mil filas al año, una cada 17 minutos. Ese numero es lo que
-- hace viable la cadena hash serializada de mas abajo; en log_acceso (una fila por
-- request HTTP) el mismo mecanismo serializaria el sitio entero contra un Postgres
-- remoto y compartido, y por eso alli NO hay cadena sino un sello diario agregado.
--
-- DOS ACTORES DISTINTOS, A PROPOSITO (D-21). Es lo unico que hace convivir dos
-- obligaciones que parecen incompatibles —el log es inmutable, y el titular tiene
-- derecho a que sus datos dejen de identificarlo—:
--   * actor_funcionario   texto, SE CONSERVA. El acto de un funcionario en ejercicio de
--                         su cargo es un acto administrativo.
--   * actor_ciudadano_id  FK SUSTITUTA. El unico mapeo id -> RUT vive en la tabla del
--                         titular; al desidentificar ese RUT, estas filas dejan de
--                         apuntar a una persona identificable SIN MODIFICAR NINGUNA.
-- Todo esto se cae si el RUT o el correo se escribieron literales en `detalle` (D-19):
-- entonces la desidentificacion no desidentifica nada y borrar el log rompe la
-- inmutabilidad. Por eso `en_log: prohibido` se decide en la fase 2, no en la 8.

-- La secuencia NO es un DEFAULT de la columna: el id se asigna DENTRO del trigger de
-- cadena, despues de tomar el advisory lock. Ver la explicacion completa en
-- fn_cadena_auditoria(). Sin eso, `ORDER BY id` y el orden de la cadena pueden diferir,
-- y la consulta C-4 del Cuaderno de Auditoria —`lag(hash_fila) OVER (ORDER BY id)`—
-- reportaria roturas falsas.
CREATE TABLE IF NOT EXISTS log_auditoria (
    id                  bigint PRIMARY KEY,

    actor_funcionario   text,
    actor_ciudadano_id  bigint,
    actor_rol           text,

    -- FK al catalogo: el segundo de los tres cerrojos. Sin ON DELETE: no hay borrado
    -- posible en catalogo_evento (trigger fn_prohibir_borrado), y una accion huerfana no
    -- puede existir.
    accion              text NOT NULL,

    entidad             text NOT NULL,

    -- D-19: `entidad_id` se parte en un bigint. Que el tipo sea numerico es lo que
    -- impide de raiz el defecto medido en admin_lista_negra.py:33-42, donde un RUT viaja
    -- como identificador de entidad y aterriza en la unica tabla que la
    -- desidentificacion no puede tocar. Un RUT con guion no compila contra bigint.
    -- LIMITACION DECLARADA: una app cuyas entidades tengan id no numerico (uuid) no
    -- puede usar esta columna. Eso es una conversacion de diseño, no un cambio de tipo:
    -- un uuid como texto vuelve a abrir la puerta que el bigint cierra.
    entidad_id_num      bigint,

    detalle             jsonb,
    valores_previos     jsonb,

    resultado           text NOT NULL DEFAULT 'exito'
                        CHECK (resultado IN ('exito','rechazado','error')),

    request_id          uuid,

    -- IP DEGRADADA, NUNCA CRUDA. Esta tabla vive 6 años y es inmutable: una IP cruda
    -- aqui seria un dato del estrato tecnico (90 dias) atrapado durante seis años en la
    -- unica tabla que no admite UPDATE. El CHECK lo hace estructuralmente imposible en
    -- vez de dejarlo en una convencion: /24 en IPv4, /48 en IPv6.
    -- La IP cruda vive en log_acceso_tecnico, correlacionada por request_id.
    ip                  inet,

    -- FAMILIA del user-agent ("Chrome/Windows"), no la cadena completa, por el mismo
    -- motivo. El CHECK usa la marca mas fiable: un user-agent real SIEMPRE trae
    -- parentesis y punto y coma ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...").
    user_agent          text,

    creado_en           timestamptz NOT NULL DEFAULT now(),

    -- ---- cadena hash (§5.5). Las escribe el trigger, jamas la aplicacion ----
    hash_previo         text,
    hash_fila           text,
    -- Version de la CANONICALIZACION, no del algoritmo. Si algun dia cambia la lista de
    -- campos que entran al hash, las filas viejas siguen siendo verificables porque cada
    -- una dice con que receta se calculo. Sin esta columna, un cambio de canonicalizacion
    -- invalida seis años de evidencia de golpe y en silencio.
    hash_version        smallint NOT NULL DEFAULT 1,
    -- 'base' = lo calculo el motor. 'aplicacion' = plan B degradado, FORJABLE por la app.
    -- Es una columna y no una nota en un README para que la degradacion se pueda contar:
    --   SELECT count(*) FROM log_auditoria WHERE hash_origen <> 'base';
    hash_origen         text NOT NULL DEFAULT 'base'
                        CHECK (hash_origen IN ('base','aplicacion')),

    CONSTRAINT chk_auditoria_ip_degradada
        CHECK (ip IS NULL
               OR (family(ip) = 4 AND masklen(ip) <= 24)
               OR (family(ip) = 6 AND masklen(ip) <= 48)),

    CONSTRAINT chk_auditoria_ua_familia
        CHECK (user_agent IS NULL
               OR (length(user_agent) <= 64 AND user_agent !~ '[();]')),

    -- El acto administrativo necesita un actor. Un evento de sistema o de scheduler no
    -- tiene ninguno de los dos y por eso la regla no es "alguno no nulo" a secas: lo que
    -- se prohibe es que los DOS esten presentes, porque un mismo acto no lo ejecutan a
    -- la vez un funcionario y un ciudadano, y esa fila seria imposible de interpretar.
    CONSTRAINT chk_auditoria_un_solo_actor
        CHECK (NOT (actor_funcionario IS NOT NULL AND actor_ciudadano_id IS NOT NULL))
);

CREATE SEQUENCE IF NOT EXISTS sq_log_auditoria_id AS bigint START 1;
ALTER SEQUENCE sq_log_auditoria_id OWNED BY log_auditoria.id;

-- FK al catalogo, idempotente sin re-validar la tabla. Un DROP + ADD (el estilo de
-- COIPO_ENTREGA_PLANTA) reescanearia log_auditoria entera en cada arranque: con seis
-- años de filas eso es un bloqueo largo sobre la tabla mas critica, en un Postgres que
-- comparten otras aplicaciones.
DO $fk$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_auditoria_catalogo'
                      AND conrelid = 'log_auditoria'::regclass) THEN
        ALTER TABLE log_auditoria
            ADD CONSTRAINT fk_auditoria_catalogo
            FOREIGN KEY (accion) REFERENCES catalogo_evento(codigo);
    END IF;
END;
$fk$;

-- NOTA SOBRE actor_ciudadano_id: aqui NO puede llevar FK. La plataforma no conoce la
-- tabla del titular —cada app la llama distinto y la crea en su 0001_dominio.sql—, asi
-- que la restriccion la añade la app:
--     ALTER TABLE log_auditoria ADD CONSTRAINT fk_auditoria_ciudadano
--         FOREIGN KEY (actor_ciudadano_id) REFERENCES <tabla_del_titular>(id);
-- El juez j10 verifica que esa constraint EXISTA en toda app que declare un titular de
-- tipo `ciudadano` en la ficha. Sin FK, `actor_ciudadano_id` es un entero suelto y el
-- mecanismo de desidentificacion por clave sustituta deja de tener quien lo sostenga.

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha     ON log_auditoria (creado_en);
CREATE INDEX IF NOT EXISTS idx_auditoria_actor     ON log_auditoria (actor_funcionario, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion    ON log_auditoria (accion, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad   ON log_auditoria (entidad, entidad_id_num);
CREATE INDEX IF NOT EXISTS idx_auditoria_request   ON log_auditoria (request_id);
-- Lo que se investiga es lo que se rechazo, no los exitos.
CREATE INDEX IF NOT EXISTS idx_auditoria_rechazos  ON log_auditoria (creado_en DESC)
    WHERE resultado <> 'exito';
-- "Todos los actos sobre esta persona" sin escribir su RUT en ninguna parte.
CREATE INDEX IF NOT EXISTS idx_auditoria_ciudadano ON log_auditoria (actor_ciudadano_id, creado_en DESC)
    WHERE actor_ciudadano_id IS NOT NULL;

COMMENT ON TABLE log_auditoria IS
    'Una fila por acto de negocio con significado. Inmutable ante UPDATE y TRUNCATE; DELETE solo via fn_purgar_log_auditoria(). Encadenada por hash. Estrato de retencion: el mas largo de sus filas (acto, 6 anios [plazo a VERIFICAR con Fiscalia]).';
COMMENT ON COLUMN log_auditoria.id IS
    'CLASIF: tec | finalidad=ordenar_la_cadena_hash | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | lo asigna el trigger bajo el advisory lock, NO un DEFAULT';
COMMENT ON COLUMN log_auditoria.actor_funcionario IS
    'CLASIF: ci | finalidad=acreditar_quien_ejecuto_el_acto_administrativo | base=cumplimiento_funciones_publicas | retencion=6a | trato=conservar_justificado | ley=19628 | D-21: SE CONSERVA, no se suprime a peticion; ver docs/cumplimiento/aviso-privacidad-funcionarios.md [base a VERIFICAR con Fiscalia]';
COMMENT ON COLUMN log_auditoria.actor_ciudadano_id IS
    'CLASIF: dd | finalidad=atribuir_el_acto_al_titular_sin_escribir_su_identificador | base=cumplimiento_funciones_publicas | retencion=6a | trato=conservar_justificado | ley=19628 | D-21: clave SUSTITUTA. Deja de identificar cuando la tabla del titular se desidentifica, sin tocar esta fila';
COMMENT ON COLUMN log_auditoria.actor_rol IS
    'CLASIF: ci | finalidad=registrar_con_que_rol_actuo_el_funcionario | base=cumplimiento_funciones_publicas | retencion=6a | trato=conservar_justificado | ley=19628 | junto a actor_funcionario es un cargo con nombre';
COMMENT ON COLUMN log_auditoria.accion IS
    'CLASIF: dn | finalidad=identificar_el_tipo_de_acto | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | FK a catalogo_evento (D-20)';
COMMENT ON COLUMN log_auditoria.entidad IS
    'CLASIF: dn | finalidad=identificar_sobre_que_recayo_el_acto | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_auditoria.entidad_id_num IS
    'CLASIF: dn | finalidad=identificar_el_expediente_concreto | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | D-19: bigint a proposito. Un RUT no compila contra bigint';
COMMENT ON COLUMN log_auditoria.detalle IS
    'CLASIF: dn | finalidad=registrar_los_datos_minimos_del_acto | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | D-19: solo claves de catalogo_evento.campos_detalle; str(exc) prohibido; PII prohibida (j04 lo verifica con AST)';
COMMENT ON COLUMN log_auditoria.valores_previos IS
    'CLASIF: dn | finalidad=acreditar_el_estado_anterior_al_acto | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | obligatorio si catalogo_evento.exige_valores_previos';
COMMENT ON COLUMN log_auditoria.resultado IS
    'CLASIF: dn | finalidad=distinguir_acto_ejecutado_de_intento_rechazado | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | exito|rechazado|error';
COMMENT ON COLUMN log_auditoria.request_id IS
    'CLASIF: tec | finalidad=correlacionar_el_acto_con_la_peticion_http | base=cumplimiento_funciones_publicas | retencion=6a | trato=conservar_justificado | ley=19628 | une esta fila con log_acceso y log_acceso_tecnico';
COMMENT ON COLUMN log_auditoria.ip IS
    'CLASIF: tec | finalidad=situar_el_acto_en_una_red_de_origen | base=cumplimiento_funciones_publicas | retencion=6a | trato=truncado | ley=19628 | precision=/24 IPv4 y /48 IPv6, forzada por CHECK. La IP cruda vive en log_acceso_tecnico con 90 dias';
COMMENT ON COLUMN log_auditoria.user_agent IS
    'CLASIF: tec | finalidad=situar_el_acto_en_una_familia_de_cliente | base=cumplimiento_funciones_publicas | retencion=6a | trato=truncado | ley=19628 | precision=familia (Chrome/Windows), forzada por CHECK. El user-agent completo vive en log_acceso_tecnico con 90 dias';
COMMENT ON COLUMN log_auditoria.creado_en IS
    'CLASIF: dn | finalidad=fechar_el_acto_administrativo | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_auditoria.hash_previo IS
    'CLASIF: tec | finalidad=encadenar_esta_fila_con_la_anterior | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | NULL = fila genesis o primera tras una purga';
COMMENT ON COLUMN log_auditoria.hash_fila IS
    'CLASIF: tec | finalidad=detectar_alteraciones_del_registro | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | SHA-256 de hash_previo + campos canonicos; se contrasta con el sello diario anclado en git';
COMMENT ON COLUMN log_auditoria.hash_version IS
    'CLASIF: tec | finalidad=saber_con_que_canonicalizacion_se_calculo_cada_fila | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_auditoria.hash_origen IS
    'CLASIF: tec | finalidad=hacer_contable_la_degradacion_criptografica | base=obligacion_legal | retencion=6a | trato=conservar_justificado | ley=19628 | base=lo calculo el motor; aplicacion=plan B FORJABLE por la app (ficha en DEUDA.md)';


-- ============================================================================
-- 4. log_acceso — UNA FILA POR REQUEST HTTP, YA DEGRADADA
-- ============================================================================
--
-- Volumen alto (cientos de miles de filas al año). Esta separada de log_auditoria para
-- que el volumen tecnico no entierre los actos de negocio: con una sola tabla, "quien
-- rechazo la solicitud 1234" seria filtrar entre cientos de miles de GET de catalogo.
--
-- AQUI NO HAY CADENA HASH, Y ES UNA DECISION, NO UN OLVIDO. Encadenar exige serializar
-- una fila por request HTTP contra un Postgres remoto y compartido: eso serializa el
-- sitio entero y convierte la auditoria en el cuello de botella del servicio. En su
-- lugar va el SELLO DIARIO agregado (tabla sello_diario + fn_sellar_dia), que se calcula
-- una vez al dia a las 03:50 con un range scan por idx_acceso_fecha.
--
-- LA IP CRUDA NO ENTRA AQUI. Se guarda ya degradada desde el PRIMER INSERT (ip_red,
-- ua_familia). Asi la degradacion a los 90 dias es un DELETE en OTRA tabla y no un
-- UPDATE sobre un log inmutable — que el trigger prohibe, y con razon: un log que se
-- puede actualizar no prueba nada.
--
-- Y NO LLEVA FK AL TITULAR: lleva `actor_seudonimo` = HMAC(sal_log, 'ciudadano:'||id).
-- Determinista, asi que "todos los accesos de esta persona" se resuelve recomputando el
-- HMAC. Lo que se pierde es el JOIN gratuito, que es precisamente el objetivo.
CREATE TABLE IF NOT EXISTS log_acceso (
    id                  bigserial PRIMARY KEY,
    request_id          uuid NOT NULL,
    metodo              text NOT NULL,

    -- PATRON de ruta ('/api/v1/solicitudes/{id}'), NUNCA la URL concreta: hay rutas que
    -- llevan datos personales en el propio path (el RUT de la lista negra, el correo del
    -- usuario interno). El CHECK no puede reconocer un patron, pero si puede reconocer
    -- lo que un patron nunca contiene: un RUT chileno. Es el defecto medido A-08.
    ruta                text NOT NULL CHECK (ruta !~ '[0-9]{7,8}-[0-9kK]'),

    ruta_params         jsonb,
    -- Solo las claves de una allowlist; el resto se reemplaza por '<omitido>'. El BODY
    -- NUNCA se guarda, lo que cierra de raiz el riesgo de persistir una credencial.
    -- `entidad_id` SALE de esa allowlist (D-19): hoy
    -- GET /api/auditoria?entidad_id=12345678-9 escribe ese RUT literal aqui.
    query               jsonb,

    status_code         integer NOT NULL,
    duracion_ms         integer NOT NULL,

    -- Red, no direccion. El CHECK lo hace estructural: /24 en IPv4, /48 en IPv6.
    ip_red              inet,
    ua_familia          text,

    actor_funcionario   text,
    actor_rol           text,
    -- HMAC con sal propia de la aplicacion (nunca compartida entre apps: con sal comun,
    -- el mismo titular produce el mismo token en todas las apps de CONAF y eso es un
    -- identificador unico de facto entre sistemas, justo la vinculabilidad que la
    -- seudonimizacion debia eliminar).
    actor_seudonimo     text,

    creado_en           timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_acceso_ip_red_degradada
        CHECK (ip_red IS NULL
               OR (family(ip_red) = 4 AND masklen(ip_red) <= 24)
               OR (family(ip_red) = 6 AND masklen(ip_red) <= 48)),

    CONSTRAINT chk_acceso_ua_familia
        CHECK (ua_familia IS NULL
               OR (length(ua_familia) <= 64 AND ua_familia !~ '[();]'))
);

CREATE INDEX IF NOT EXISTS idx_acceso_fecha     ON log_acceso (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_acceso_request   ON log_acceso (request_id);
CREATE INDEX IF NOT EXISTS idx_acceso_actor     ON log_acceso (actor_funcionario, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_acceso_seudonimo ON log_acceso (actor_seudonimo, creado_en DESC)
    WHERE actor_seudonimo IS NOT NULL;
-- Indice parcial: lo que se investiga es lo que falla, no los 200.
CREATE INDEX IF NOT EXISTS idx_acceso_errores   ON log_acceso (status_code, creado_en DESC)
    WHERE status_code >= 400;

COMMENT ON TABLE log_acceso IS
    'Una fila por request HTTP, con la IP y el user-agent YA degradados. Sin cadena hash a proposito (serializaria el sitio); el ancla es el sello diario. Inmutable ante UPDATE y TRUNCATE; DELETE solo via fn_purgar_log_acceso().';
COMMENT ON COLUMN log_acceso.id IS
    'CLASIF: tec | finalidad=ordenar_e_identificar_la_fila | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.request_id IS
    'CLASIF: tec | finalidad=correlacionar_la_peticion_con_el_acto_y_con_el_estrato_tecnico | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.metodo IS
    'CLASIF: tec | finalidad=registrar_el_verbo_http | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.ruta IS
    'CLASIF: tec | finalidad=registrar_que_se_consulto | base=cumplimiento_funciones_publicas | retencion=5a | trato=generalizacion | ley=19628 | PATRON de ruta, nunca la URL concreta; CHECK contra RUT literal (A-08)';
COMMENT ON COLUMN log_acceso.ruta_params IS
    'CLASIF: tec | finalidad=registrar_los_parametros_de_ruta_permitidos | base=cumplimiento_funciones_publicas | retencion=5a | trato=supresion | ley=19628 | allowlist; el resto se omite';
COMMENT ON COLUMN log_acceso.query IS
    'CLASIF: tec | finalidad=registrar_los_filtros_de_consulta_permitidos | base=cumplimiento_funciones_publicas | retencion=5a | trato=supresion | ley=19628 | allowlist SIN entidad_id (D-19); el body nunca se guarda';
COMMENT ON COLUMN log_acceso.status_code IS
    'CLASIF: tec | finalidad=distinguir_acceso_concedido_de_denegado | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.duracion_ms IS
    'CLASIF: tec | finalidad=detectar_degradacion_y_consultas_masivas | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.ip_red IS
    'CLASIF: tec | finalidad=situar_el_acceso_en_una_red_de_origen | base=cumplimiento_funciones_publicas | retencion=5a | trato=truncado | ley=19628 | precision=/24 IPv4 y /48 IPv6, forzada por CHECK';
COMMENT ON COLUMN log_acceso.ua_familia IS
    'CLASIF: tec | finalidad=situar_el_acceso_en_una_familia_de_cliente | base=cumplimiento_funciones_publicas | retencion=5a | trato=truncado | ley=19628 | precision=familia (Chrome/Windows)';
COMMENT ON COLUMN log_acceso.actor_funcionario IS
    'CLASIF: ci | finalidad=acreditar_quien_accedio_a_los_datos | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.actor_rol IS
    'CLASIF: ci | finalidad=registrar_con_que_rol_se_accedio | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN log_acceso.actor_seudonimo IS
    'CLASIF: dd | finalidad=rastrear_los_accesos_de_un_titular_sin_escribir_su_identificador | base=cumplimiento_funciones_publicas | retencion=5a | trato=hmac_v1 | ley=19628 | HMAC con sal propia de esta aplicacion; NO es dato anonimo (sigue siendo dato personal seudonimizado)';
COMMENT ON COLUMN log_acceso.creado_en IS
    'CLASIF: tec | finalidad=fechar_el_acceso | base=cumplimiento_funciones_publicas | retencion=5a | trato=conservar_justificado | ley=19628';


-- ============================================================================
-- 5. log_acceso_tecnico — LA IP CRUDA, 90 DIAS, Y NADA MAS
-- ============================================================================
--
-- El tercer estrato existe para no tener que elegir entre dos errores: guardar la IP
-- cruda cinco años (dato personal de alto volumen y bajo valor probatorio una vez
-- registrado el evento) o borrar el acto administrativo a los 90 dias.
--
-- Se correlaciona con log_acceso y log_auditoria por request_id, SIN clave foranea: las
-- tres tablas se purgan con plazos distintos y una FK obligaria a que la mas corta
-- sobreviviera a la mas larga, que es exactamente lo contrario de lo que se quiere.
CREATE TABLE IF NOT EXISTS log_acceso_tecnico (
    id          bigserial PRIMARY KEY,
    request_id  uuid NOT NULL,
    ip          inet,
    user_agent  text,
    creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acceso_tecnico_fecha   ON log_acceso_tecnico (creado_en);
CREATE INDEX IF NOT EXISTS idx_acceso_tecnico_request ON log_acceso_tecnico (request_id);

COMMENT ON TABLE log_acceso_tecnico IS
    'Estrato tecnico: la IP cruda y el user-agent completo, 90 dias. Se correlaciona por request_id, sin FK (los tres logs se purgan con plazos distintos). Inmutable ante UPDATE y TRUNCATE; DELETE solo via fn_purgar_log_tecnico().';
COMMENT ON COLUMN log_acceso_tecnico.id IS
    'CLASIF: tec | finalidad=identificar_la_fila | base=cumplimiento_funciones_publicas | retencion=90d | trato=supresion | ley=19628';
COMMENT ON COLUMN log_acceso_tecnico.request_id IS
    'CLASIF: tec | finalidad=correlacionar_con_log_acceso_y_log_auditoria | base=cumplimiento_funciones_publicas | retencion=90d | trato=supresion | ley=19628';
COMMENT ON COLUMN log_acceso_tecnico.ip IS
    'CLASIF: tec | finalidad=investigacion_forense_de_un_incidente_reciente | base=cumplimiento_funciones_publicas | retencion=90d | trato=supresion | ley=19628 | LA IP ES DATO PERSONAL. Es el unico sitio del esquema donde vive sin degradar';
COMMENT ON COLUMN log_acceso_tecnico.user_agent IS
    'CLASIF: tec | finalidad=investigacion_forense_de_un_incidente_reciente | base=cumplimiento_funciones_publicas | retencion=90d | trato=supresion | ley=19628 | cadena completa; su version degradada (familia) vive en log_acceso';
COMMENT ON COLUMN log_acceso_tecnico.creado_en IS
    'CLASIF: tec | finalidad=fechar_para_la_purga_a_90_dias | base=cumplimiento_funciones_publicas | retencion=90d | trato=supresion | ley=19628';


-- ============================================================================
-- 6. retencion_ejecucion — LA PRUEBA DE QUE LA RETENCION CORRIO
-- ============================================================================
--
-- EL FALLO QUE MOTIVA ESTA TABLA. Hoy el evento de purga se escribe en log_auditoria,
-- que se purga a los 2 años: A LOS 2 AÑOS DESAPARECE LA EVIDENCIA DE QUE LA PURGA
-- OCURRIO. Nada falla y nada avisa. La prueba de que la retencion corrio NO PUEDE VIVIR
-- EN UNA TABLA QUE SE PURGA A SI MISMA (invariante RET-3).
--
-- Por eso esta tabla:
--   * NO tiene funcion de purga, y su trigger prohibe DELETE y TRUNCATE sin escapatoria
--     (no hay flag `purga_autorizada` que valga aqui).
--   * NO contiene datos personales: conteos, fechas, version del catalogo, hash del
--     script y hashes de la cadena. Nada mas. Es lo que permite conservarla para siempre
--     sin que la conservacion sea, ella misma, un tratamiento que haya que justificar.
--   * REGISTRA EL FALLO, no solo el camino feliz. Hoy anonimizacion.py y purga_logs.py
--     escriben solo si todo salio bien, dentro de la misma transaccion, con
--     `except: rollback; raise`: si el job falla no queda ni una fila, y la bitacora que
--     se le entrega a Contraloria no puede distinguir "no habia nada que hacer" de
--     "lleva un año reventando".
--
-- COMO SE USA: el job INSERTA al empezar (resultado='en_curso', fin NULL) y CIERRA la
-- fila al terminar. El cierre es el unico UPDATE permitido, y solo una vez. Un job que
-- se cae deja una fila abierta para siempre: esa fila ES la evidencia del fallo. Una
-- tabla append-only pura no podria distinguir "empezo y murio" de "nunca empezo".
CREATE TABLE IF NOT EXISTS retencion_ejecucion (
    id                      bigserial PRIMARY KEY,

    -- El Postgres es compartido y hay bases compartidas entre aplicaciones (D-16). Sin
    -- esta columna, dos apps que comparten base mezclan sus bitacoras de retencion y
    -- ninguna de las dos puede probar la suya.
    aplicacion              text NOT NULL,
    job                     text NOT NULL,

    -- El Cuaderno de Auditoria consulta por este nombre: no se renombra.
    ejecutado_en            timestamptz NOT NULL DEFAULT now(),
    fin                     timestamptz,

    -- Fecha de corte efectivamente aplicada. Se calcula con una funcion pura del dominio
    -- sobre el huso America/Santiago; `ahora.replace(year=...)` esta PROHIBIDO porque
    -- revienta con ValueError un 29 de febrero (hoy no ocurre por accidente del cron, que
    -- corre el dia 1, no por diseño).
    corte_aplicado          timestamptz,

    filas_afectadas         bigint  NOT NULL DEFAULT 0,
    version_catalogo        integer,
    sha256_script           text,

    resultado               text NOT NULL DEFAULT 'en_curso'
                            CHECK (resultado IN ('en_curso','ok','sin_trabajo','parcial','fallo')),
    -- Codigo de una lista cerrada, jamas `str(exc)`: el str de un fallo SMTP incluye el
    -- destinatario y el de un IntegrityError incluye el valor que violo el UNIQUE.
    codigo_error            text,

    -- LA PURGA TRUNCA LA CADENA, NO LA ROMPE. Estos dos hashes son lo que convierte un
    -- tramo borrado en un tramo VERIFICABLE: sin ellos, una cadena con un hueco es
    -- indistinguible de una cadena alterada. Se guardan tambien aqui —y no solo en el
    -- `detalle` del evento de purga— porque el evento vive en log_auditoria y log_auditoria
    -- se purga; esta tabla no. Es el mismo razonamiento de RET-3 aplicado a la cadena.
    hash_ultimo_borrado     text,
    hash_primero_conservado text,

    CONSTRAINT chk_retencion_fin_coherente
        CHECK ((resultado = 'en_curso' AND fin IS NULL)
               OR (resultado <> 'en_curso' AND fin IS NOT NULL)),
    CONSTRAINT chk_retencion_error_con_codigo
        CHECK (resultado <> 'fallo' OR codigo_error IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_retencion_ejecutado ON retencion_ejecucion (ejecutado_en DESC);
CREATE INDEX IF NOT EXISTS idx_retencion_job       ON retencion_ejecucion (job, ejecutado_en DESC);
-- Un job abierto es un job que murio a mitad. Se consulta seguido y son pocas filas.
CREATE INDEX IF NOT EXISTS idx_retencion_abiertos  ON retencion_ejecucion (job, ejecutado_en DESC)
    WHERE fin IS NULL;

COMMENT ON TABLE retencion_ejecucion IS
    'Bitacora de ejecucion de los jobs de retencion. SIN datos personales y SIN purga (invariante RET-3): la prueba de que la retencion corrio no puede vivir en una tabla que se purga a si misma. DELETE y TRUNCATE prohibidos sin escapatoria; el unico UPDATE permitido es el cierre, y una sola vez.';
COMMENT ON COLUMN retencion_ejecucion.id IS
    'CLASIF: dn | finalidad=identificar_la_ejecucion | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.aplicacion IS
    'CLASIF: dn | finalidad=atribuir_la_ejecucion_cuando_la_base_es_compartida | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.job IS
    'CLASIF: dn | finalidad=identificar_que_job_de_retencion_corrio | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.ejecutado_en IS
    'CLASIF: dn | finalidad=fechar_el_inicio_de_la_ejecucion | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.fin IS
    'CLASIF: dn | finalidad=fechar_el_cierre_de_la_ejecucion | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | NULL = el job empezo y no reporto fin: eso ES la evidencia del fallo';
COMMENT ON COLUMN retencion_ejecucion.corte_aplicado IS
    'CLASIF: dn | finalidad=acreditar_que_fecha_de_corte_se_aplico | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.filas_afectadas IS
    'CLASIF: dn | finalidad=cuantificar_lo_purgado_o_desidentificado | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.version_catalogo IS
    'CLASIF: dn | finalidad=saber_con_que_version_del_catalogo_se_ejecuto | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.sha256_script IS
    'CLASIF: dn | finalidad=acreditar_que_codigo_ejecuto_la_retencion | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.resultado IS
    'CLASIF: dn | finalidad=distinguir_sin_trabajo_de_fallo | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.codigo_error IS
    'CLASIF: dn | finalidad=clasificar_el_fallo_sin_texto_libre | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | valor de lista cerrada; str(exc) PROHIBIDO';
COMMENT ON COLUMN retencion_ejecucion.hash_ultimo_borrado IS
    'CLASIF: dn | finalidad=marcar_donde_quedo_truncada_la_cadena | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN retencion_ejecucion.hash_primero_conservado IS
    'CLASIF: dn | finalidad=marcar_donde_reanuda_la_cadena_verificable | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';


-- ============================================================================
-- 7. sello_diario — EL ANCLA. Lo que hace detectable una alteracion
-- ============================================================================
--
-- El trigger no protege del DBA; el sello si, porque se COMMITEA a git. Cada fila de
-- esta tabla se exporta a docs/cumplimiento/sellos/AAAA-MM.jsonl desde un cron en el
-- runner conaf-prod. El commit tiene fecha, autor y un SHA que depende de todo el
-- historial, y vive en GitHub, fuera del servidor. Un hueco en la serie de fechas es
-- visible en `git log`.
--
-- Un sello NO SE PISA. Si el dia ya esta sellado, `fn_sellar_dia` no hace nada y lo
-- informa. Un sello reescrito es evidencia destruida, no un sello corregido; por eso el
-- trigger prohibe UPDATE y DELETE sin escapatoria.
CREATE TABLE IF NOT EXISTS sello_diario (
    tabla        text NOT NULL CHECK (tabla IN ('log_auditoria','log_acceso')),
    fecha        date NOT NULL,
    filas        bigint NOT NULL,
    primer_id    bigint,
    ultimo_id    bigint,
    -- log_auditoria: el hash_fila de la ultima fila del dia (cierre de la cadena).
    -- log_acceso:    plegado incremental SHA-256 sobre las filas del dia, en orden de id.
    hash_sello   text NOT NULL,
    hash_version smallint NOT NULL DEFAULT 1,
    generado_en  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tabla, fecha)
);

COMMENT ON TABLE sello_diario IS
    'Ancla diaria del log. Se exporta a docs/cumplimiento/sellos/AAAA-MM.jsonl y se commitea desde el runner: es lo unico que queda fuera del alcance de quien administra el Postgres. Un sello no se pisa: UPDATE y DELETE prohibidos.';
COMMENT ON COLUMN sello_diario.tabla IS
    'CLASIF: dn | finalidad=identificar_que_log_se_sello | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.fecha IS
    'CLASIF: dn | finalidad=identificar_el_dia_sellado | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628 | fecha civil de America/Santiago';
COMMENT ON COLUMN sello_diario.filas IS
    'CLASIF: dn | finalidad=cuantificar_las_filas_cubiertas_por_el_sello | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.primer_id IS
    'CLASIF: dn | finalidad=delimitar_el_tramo_sellado | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.ultimo_id IS
    'CLASIF: dn | finalidad=delimitar_el_tramo_sellado | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.hash_sello IS
    'CLASIF: dn | finalidad=anclar_el_estado_del_log_del_dia | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.hash_version IS
    'CLASIF: dn | finalidad=saber_con_que_receta_se_calculo_el_sello | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';
COMMENT ON COLUMN sello_diario.generado_en IS
    'CLASIF: dn | finalidad=fechar_la_generacion_del_sello | base=obligacion_legal | retencion=permanente | trato=conservar_justificado | ley=19628';


-- ============================================================================
-- 8. TRIGGERS DE INMUTABILIDAD
-- ============================================================================
--
-- LA TENSION QUE RESUELVEN. Se exige un log inmutable, y a la vez se exige BORRARLO al
-- vencer la retencion. Con un solo rol de base de datos, negar UPDATE y DELETE a secas
-- haria imposible cumplir la retencion. La resolucion:
--
--   * UPDATE: prohibido SIEMPRE. Un registro alterado es peor que uno borrado.
--   * DELETE: prohibido salvo dentro de una fn_purgar_*, que se autoriza con un flag
--     LOCAL A LA TRANSACCION (tercer argumento de set_config = true). Al terminar la
--     transaccion, el permiso desaparece solo.
--   * TRUNCATE: prohibido siempre, y con SU PROPIO trigger. TRUNCATE no dispara los
--     triggers de UPDATE/DELETE, ni de fila ni de sentencia: sin estas lineas, un solo
--     `TRUNCATE log_auditoria` borraba todo el rastro sin que la proteccion se enterara.
--     Un agujero de una palabra.
--
-- FOR EACH STATEMENT y no FOR EACH ROW: el guard no mira las filas, solo el flag, asi
-- que basta evaluarlo una vez por sentencia. Con FOR EACH ROW la purga anual pagaria una
-- invocacion de plpgsql por cada fila borrada (decenas de miles) sin ganar nada.
--
-- No se usa SECURITY DEFINER: el dueño de las tablas es el mismo rol de la app, asi que
-- definer == invoker y no aportaria nada. Lo que restringe es el trigger.

CREATE OR REPLACE FUNCTION fn_log_inmutable() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF TG_OP = 'TRUNCATE' THEN
        RAISE EXCEPTION 'log inmutable: TRUNCATE prohibido en % (0000_plataforma.sql seccion 8)',
            TG_TABLE_NAME
            USING ERRCODE = 'restrict_violation';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'log inmutable: % no admite UPDATE. Un registro alterado es peor que uno borrado',
            TG_TABLE_NAME
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- DELETE: solo desde una fn_purgar_*, que pone el flag transaccional.
    IF coalesce(current_setting('coipo.purga_autorizada', true), 'off') <> 'on' THEN
        RAISE EXCEPTION 'log inmutable: % solo admite DELETE via fn_purgar_* (retencion por estrato)',
            TG_TABLE_NAME
            USING ERRCODE = 'restrict_violation';
    END IF;

    RETURN NULL;   -- trigger de sentencia: el valor de retorno se ignora
END;
$fn$;

COMMENT ON FUNCTION fn_log_inmutable() IS
    'Guard de inmutabilidad de los tres logs. UPDATE y TRUNCATE siempre prohibidos; DELETE solo bajo el flag transaccional coipo.purga_autorizada que ponen las fn_purgar_*.';

-- Prohibicion absoluta de borrado, sin flag de escape. Para las tablas que son evidencia
-- de si mismas: el catalogo (un evento retirado no se borra: rompe la FK de las filas
-- historicas), la bitacora de retencion (RET-3) y los sellos.
CREATE OR REPLACE FUNCTION fn_prohibir_borrado() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    RAISE EXCEPTION '% no admite % : es evidencia y no se purga (RET-3 / D-20)',
        TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
    RETURN NULL;
END;
$fn$;

COMMENT ON FUNCTION fn_prohibir_borrado() IS
    'Guard sin escapatoria: DELETE y TRUNCATE prohibidos. Se aplica a catalogo_evento, retencion_ejecucion y sello_diario.';

-- El cierre de una ejecucion de retencion: el UNICO UPDATE permitido en esa tabla, y una
-- sola vez. Es FOR EACH ROW porque aqui si hay que mirar las filas.
CREATE OR REPLACE FUNCTION fn_retencion_ejecucion_cierre() RETURNS trigger
LANGUAGE plpgsql AS $fn$
BEGIN
    IF OLD.fin IS NOT NULL THEN
        RAISE EXCEPTION 'retencion_ejecucion: la fila % ya esta cerrada y no se reabre', OLD.id
            USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.fin IS NULL THEN
        RAISE EXCEPTION 'retencion_ejecucion: el unico UPDATE permitido es el cierre (fin NOT NULL)'
            USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.id <> OLD.id
       OR NEW.aplicacion   <> OLD.aplicacion
       OR NEW.job          <> OLD.job
       OR NEW.ejecutado_en <> OLD.ejecutado_en THEN
        RAISE EXCEPTION 'retencion_ejecucion: id, aplicacion, job y ejecutado_en son inmutables'
            USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION fn_retencion_ejecucion_cierre() IS
    'Permite exactamente un UPDATE por fila: el cierre de la ejecucion. Una fila que queda con fin NULL es la evidencia de un job que murio a mitad.';

-- Los triggers. DROP + CREATE porque CREATE TRIGGER no admite IF NOT EXISTS en las
-- versiones que esta flota opera, y recrear un trigger no reescanea la tabla.
DROP TRIGGER IF EXISTS trg_log_auditoria_inmutable ON log_auditoria;
CREATE TRIGGER trg_log_auditoria_inmutable
    BEFORE UPDATE OR DELETE ON log_auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

DROP TRIGGER IF EXISTS trg_log_auditoria_no_truncate ON log_auditoria;
CREATE TRIGGER trg_log_auditoria_no_truncate
    BEFORE TRUNCATE ON log_auditoria
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

DROP TRIGGER IF EXISTS trg_log_acceso_inmutable ON log_acceso;
CREATE TRIGGER trg_log_acceso_inmutable
    BEFORE UPDATE OR DELETE ON log_acceso
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

DROP TRIGGER IF EXISTS trg_log_acceso_no_truncate ON log_acceso;
CREATE TRIGGER trg_log_acceso_no_truncate
    BEFORE TRUNCATE ON log_acceso
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

DROP TRIGGER IF EXISTS trg_log_tecnico_inmutable ON log_acceso_tecnico;
CREATE TRIGGER trg_log_tecnico_inmutable
    BEFORE UPDATE OR DELETE ON log_acceso_tecnico
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

DROP TRIGGER IF EXISTS trg_log_tecnico_no_truncate ON log_acceso_tecnico;
CREATE TRIGGER trg_log_tecnico_no_truncate
    BEFORE TRUNCATE ON log_acceso_tecnico
    FOR EACH STATEMENT EXECUTE FUNCTION fn_log_inmutable();

-- catalogo_evento: UPDATE SI (la resiembra usa ON CONFLICT DO UPDATE y el retiro escribe
-- retirado_en); DELETE y TRUNCATE NO, nunca.
DROP TRIGGER IF EXISTS trg_catalogo_no_borrado ON catalogo_evento;
CREATE TRIGGER trg_catalogo_no_borrado
    BEFORE DELETE ON catalogo_evento
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_catalogo_no_truncate ON catalogo_evento;
CREATE TRIGGER trg_catalogo_no_truncate
    BEFORE TRUNCATE ON catalogo_evento
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_retencion_no_borrado ON retencion_ejecucion;
CREATE TRIGGER trg_retencion_no_borrado
    BEFORE DELETE ON retencion_ejecucion
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_retencion_no_truncate ON retencion_ejecucion;
CREATE TRIGGER trg_retencion_no_truncate
    BEFORE TRUNCATE ON retencion_ejecucion
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_retencion_cierre ON retencion_ejecucion;
CREATE TRIGGER trg_retencion_cierre
    BEFORE UPDATE ON retencion_ejecucion
    FOR EACH ROW EXECUTE FUNCTION fn_retencion_ejecucion_cierre();

DROP TRIGGER IF EXISTS trg_sello_no_update ON sello_diario;
CREATE TRIGGER trg_sello_no_update
    BEFORE UPDATE ON sello_diario
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_sello_no_borrado ON sello_diario;
CREATE TRIGGER trg_sello_no_borrado
    BEFORE DELETE ON sello_diario
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();

DROP TRIGGER IF EXISTS trg_sello_no_truncate ON sello_diario;
CREATE TRIGGER trg_sello_no_truncate
    BEFORE TRUNCATE ON sello_diario
    FOR EACH STATEMENT EXECUTE FUNCTION fn_prohibir_borrado();


-- ============================================================================
-- 9. LA CADENA HASH DE log_auditoria
-- ============================================================================
--
-- hash_fila_n = SHA256( hash_fila_{n-1} || campos canonicos de la fila n )
--
-- POR QUE UN TRIGGER Y NO LA APLICACION. Si el hash lo calcula la app, la app puede
-- forjarlo: el control protegeria de un error, no de una intencion. Calculado por la
-- base, para reescribir el pasado hay que recomputar la cadena entera, y eso choca
-- contra el sello diario anclado en git.
--
-- POR QUE UN ADVISORY LOCK Y POR QUE NO IMPORTA. Dos INSERT concurrentes que lean el
-- mismo "ultimo hash" producen dos filas que dicen ser la misma posicion de la cadena, y
-- la verificacion falla para siempre sin que nadie haya alterado nada.
-- `pg_advisory_xact_lock` serializa a los escritores del log. El coste: con ~15-30 mil
-- filas al año —una cada 17 minutos— la contencion es nula. En log_acceso, con una fila
-- por request, el mismo mecanismo serializaria el sitio entero: por eso alli no hay
-- cadena sino sello diario. La diferencia no es de gusto, es de volumen.
--
-- POR QUE EL id SE ASIGNA AQUI DENTRO Y NO CON UN DEFAULT. Los DEFAULT se evaluan ANTES
-- de los triggers BEFORE. Con `bigserial`, dos transacciones pueden tomar los ids 5 y 6 y
-- llegar al trigger en el orden inverso: la fila 6 se encadena a la 4 y la fila 5 a la 6.
-- El orden de la cadena y el orden de los ids dejan de coincidir, y la consulta C-4 del
-- Cuaderno de Auditoria —`lag(hash_fila) OVER (ORDER BY id)`— reporta roturas que no
-- existen. Tomando el nextval DESPUES del lock, el id crece exactamente en el orden de la
-- cadena. Un rollback deja un hueco en la numeracion (inherente a las secuencias) y eso
-- no rompe nada: la verificacion ordena, no cuenta.
--
-- POR QUE SE EXIGE READ COMMITTED. Bajo REPEATABLE READ o SERIALIZABLE, la instantanea
-- de la transaccion puede ser ANTERIOR al commit del escritor previo: el SELECT del
-- ultimo hash devolveria una fila vieja aun teniendo el lock, y la cadena se bifurcaria.
-- Es un fallo que no se manifiesta bajo carga baja y aparece el dia que alguien cambia el
-- nivel de aislamiento por otro motivo. Por eso se comprueba, no se documenta.

CREATE OR REPLACE FUNCTION fn_cadena_auditoria() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
    v_modo     text;
    v_canonico text;
BEGIN
    IF current_setting('transaction_isolation') <> 'read committed' THEN
        RAISE EXCEPTION 'log_auditoria exige READ COMMITTED (aislamiento actual: %). '
                        'Con una instantanea anterior al commit del escritor previo la '
                        'cadena se bifurca en silencio',
            current_setting('transaction_isolation')
            USING ERRCODE = 'invalid_transaction_state';
    END IF;

    IF NEW.id IS NOT NULL THEN
        RAISE EXCEPTION 'log_auditoria.id lo asigna la base: no se envia desde la aplicacion'
            USING ERRCODE = 'restrict_violation';
    END IF;

    -- 4712 = clase de lock de la cadena de auditoria COIPO; 1 = log_auditoria. Constantes
    -- literales y no hashtext(): los locks consultivos son por BASE DE DATOS, y hay bases
    -- compartidas entre aplicaciones (D-16). Un valor estable y escrito es auditable; una
    -- funcion de hash interna no documentada, no.
    PERFORM pg_advisory_xact_lock(4712, 1);

    SELECT valor INTO v_modo FROM plataforma_capacidad WHERE clave = 'hash_de_auditoria';
    v_modo := coalesce(v_modo, 'aplicacion');

    NEW.id := nextval('sq_log_auditoria_id');

    IF v_modo = 'base' THEN
        IF NEW.hash_fila IS NOT NULL OR NEW.hash_previo IS NOT NULL THEN
            -- No se sobrescribe en silencio: una aplicacion que intenta escribir su propio
            -- hash esta intentando exactamente lo que este trigger existe para impedir, y
            -- eso tiene que ser ruidoso.
            RAISE EXCEPTION 'la cadena la calcula la base: no se envian hash_fila ni hash_previo'
                USING ERRCODE = 'restrict_violation';
        END IF;

        SELECT hash_fila INTO NEW.hash_previo
        FROM log_auditoria ORDER BY id DESC LIMIT 1;

        -- CANONICALIZACION v1. Cambiar esta lista o este orden obliga a subir
        -- hash_version: las filas ya escritas siguen siendo verificables con su propia
        -- receta. El separador es US (0x1f) y los nulos se marcan con '\N' para que
        -- NULL y cadena vacia no colapsen en el mismo hash.
        -- `creado_en` se rinde en UTC con formato explicito: `::text` depende de DateStyle
        -- y de TimeZone de la sesion, y la misma fila hasheada desde otra sesion daria
        -- otro resultado.
        v_canonico := concat_ws(E'\x1f',
            NEW.id::text,
            to_char(NEW.creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            coalesce(NEW.actor_funcionario, '\N'),
            coalesce(NEW.actor_ciudadano_id::text, '\N'),
            coalesce(NEW.actor_rol, '\N'),
            NEW.accion,
            NEW.entidad,
            coalesce(NEW.entidad_id_num::text, '\N'),
            NEW.resultado,
            coalesce(NEW.detalle::text, '\N'),
            coalesce(NEW.valores_previos::text, '\N'),
            coalesce(NEW.request_id::text, '\N'),
            coalesce(NEW.ip::text, '\N'),
            coalesce(NEW.user_agent, '\N')
        );

        NEW.hash_fila    := fn_sha256_hex(coalesce(NEW.hash_previo, '') || E'\x1e' || v_canonico);
        NEW.hash_version := 1;
        NEW.hash_origen  := 'base';

    ELSE
        -- PLAN B DECLARADO Y VISIBLE. El motor no puede calcular SHA-256, asi que la
        -- cadena la trae la aplicacion y POR LO TANTO LA APLICACION PUEDE FORJARLA. No es
        -- un control: es una limitacion. Queda marcada fila por fila para que se pueda
        -- contar, y el test test_el_hash_lo_calcula_la_base_no_la_aplicacion queda ROJO
        -- hasta que se resuelva. Ficha obligatoria en DEUDA.md.
        IF NEW.hash_fila IS NULL THEN
            RAISE EXCEPTION 'modo degradado: la aplicacion debe calcular hash_fila '
                            '(ver plataforma_capacidad y DEUDA.md)'
                USING ERRCODE = 'restrict_violation';
        END IF;
        NEW.hash_origen := 'aplicacion';
    END IF;

    RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION fn_cadena_auditoria() IS
    'Encadena cada fila de log_auditoria con la anterior. Asigna el id bajo el advisory lock para que el orden de la cadena y el de los ids coincidan (la consulta C-4 ordena por id). Exige READ COMMITTED.';

DROP TRIGGER IF EXISTS trg_log_auditoria_cadena ON log_auditoria;
CREATE TRIGGER trg_log_auditoria_cadena
    BEFORE INSERT ON log_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_cadena_auditoria();


-- ============================================================================
-- 10. FUNCIONES DE PURGA
-- ============================================================================
--
-- Las tres devuelven la MISMA forma para que el scheduler tenga un solo camino de
-- codigo, y las tres registran su propio corte:
--
--     (tabla, corte, filas_borradas, hash_ultimo_borrado, hash_primero_conservado)
--
-- Los dos hashes solo tienen valor donde hay cadena (log_auditoria). En log_acceso y
-- log_acceso_tecnico salen NULL, y eso NO es un hueco: alli el ancla es el sello diario,
-- que sigue en git aunque las filas ya no esten.
--
-- LA PURGA TRUNCA LA CADENA, NO LA ROMPE. Se borra un PREFIJO —todas las filas hasta un
-- id— y nunca filas sueltas del medio. Un borrado por criterio (por ejemplo "solo las
-- del estrato tecnico") dejaria HUECOS, y una cadena con huecos es indistinguible de una
-- cadena alterada. La fila mas antigua que sobrevive conserva un `hash_previo` que apunta
-- a una fila que ya no existe: eso es lo ESPERADO, y la consulta C-4 lo muestra como una
-- discontinuidad en el punto de corte. Lo que la explica son los dos hashes que devuelve
-- esta funcion, guardados en retencion_ejecucion, que no se purga.
--
-- CONSECUENCIA QUE HAY QUE DECIR EN VOZ ALTA: como el borrado es por prefijo, las filas
-- de log_auditoria de estrato `tecnica` o `pii` viven tanto como las de estrato `acto`.
-- Eso es aceptable —y solo es aceptable— porque en esta tabla:
--   * no entra ninguna IP cruda ni ningun user-agent completo (los CHECK lo impiden),
--   * el titular se referencia por clave sustituta, de modo que su derecho se satisface
--     desidentificando SU tabla, sin tocar el log (D-21),
--   * `detalle` no admite claves con datos personales (D-19, verificado por j04).
-- Si alguna de esas tres cosas dejara de ser cierta, este diseño de purga deja de ser
-- defendible. [Plazo del estrato acto y esta lectura: VERIFICAR con Fiscalia.]

CREATE OR REPLACE FUNCTION fn_purgar_log_auditoria(
    p_anios_acto integer DEFAULT 6,
    p_anios_pii  integer DEFAULT 5
)
RETURNS TABLE(tabla text, corte timestamptz, filas_borradas bigint,
              hash_ultimo_borrado text, hash_primero_conservado text)
LANGUAGE plpgsql AS $fn$
DECLARE
    v_corte      timestamptz;
    v_id_corte   bigint;
    v_n          bigint;
    v_hash_ult   text;
    v_hash_prim  text;
BEGIN
    -- Sin este guard, un 0 accidental borraria el log completo y la llamada pareceria
    -- legitima.
    IF p_anios_acto IS NULL OR p_anios_acto < 1 THEN
        RAISE EXCEPTION 'fn_purgar_log_auditoria: p_anios_acto debe ser >= 1 (recibido: %)',
            p_anios_acto;
    END IF;

    -- INVARIANTE RET-1, tambien aqui. Ya se comprueba en el arranque de la app, pero el
    -- job de retencion puede llamarse a mano desde un psql, y el fallo que motiva esta
    -- linea es exactamente ese: en COIPO_ENTREGA_PLANTA el log de actos se purga a los 2
    -- años y el dato del titular se desidentifica a los 5. El acto sobrevive a la prueba
    -- de quien lo tramito. Silencioso al 100 %: los dos jobs corren verdes.
    IF p_anios_pii IS NOT NULL AND p_anios_acto < p_anios_pii THEN
        RAISE EXCEPTION 'RET-1: la retencion del acto (% anios) no puede ser menor que la '
                        'del dato personal (% anios). Se estaria borrando la prueba de quien '
                        'tramito un expediente que todavia existe',
            p_anios_acto, p_anios_pii;
    END IF;

    v_corte := now() - make_interval(years => p_anios_acto);

    -- El corte es por PREFIJO de la cadena. Se toma el mayor id ya vencido y se borra
    -- todo lo anterior o igual. En el borde, una fila hasta una duracion de transaccion
    -- mas nueva que el corte puede irse con el prefijo: es preferible a dejar un hueco.
    SELECT max(id) INTO v_id_corte FROM log_auditoria WHERE creado_en < v_corte;

    IF v_id_corte IS NULL THEN
        RETURN QUERY SELECT 'log_auditoria'::text, v_corte, 0::bigint, NULL::text, NULL::text;
        RETURN;
    END IF;

    SELECT hash_fila INTO v_hash_ult  FROM log_auditoria WHERE id = v_id_corte;
    SELECT hash_fila INTO v_hash_prim FROM log_auditoria WHERE id > v_id_corte
        ORDER BY id ASC LIMIT 1;

    -- Local a la transaccion (tercer argumento true): al terminar, el permiso desaparece
    -- solo. No hay forma de dejarlo encendido por descuido.
    PERFORM set_config('coipo.purga_autorizada', 'on', true);

    DELETE FROM log_auditoria WHERE id <= v_id_corte;
    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('coipo.purga_autorizada', 'off', true);

    RETURN QUERY SELECT 'log_auditoria'::text, v_corte, v_n, v_hash_ult, v_hash_prim;
END;
$fn$;

COMMENT ON FUNCTION fn_purgar_log_auditoria(integer, integer) IS
    'Purga por PREFIJO el log de actos. Comprueba RET-1 (acto >= pii) y devuelve los dos hashes que convierten una cadena truncada en una cadena verificable por tramos.';


CREATE OR REPLACE FUNCTION fn_purgar_log_acceso(p_anios integer DEFAULT 5)
RETURNS TABLE(tabla text, corte timestamptz, filas_borradas bigint,
              hash_ultimo_borrado text, hash_primero_conservado text)
LANGUAGE plpgsql AS $fn$
DECLARE
    v_corte timestamptz;
    v_n     bigint;
BEGIN
    IF p_anios IS NULL OR p_anios < 1 THEN
        RAISE EXCEPTION 'fn_purgar_log_acceso: p_anios debe ser >= 1 (recibido: %)', p_anios;
    END IF;
    v_corte := now() - make_interval(years => p_anios);

    PERFORM set_config('coipo.purga_autorizada', 'on', true);
    DELETE FROM log_acceso WHERE creado_en < v_corte;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM set_config('coipo.purga_autorizada', 'off', true);

    -- NULL en los dos hashes: en log_acceso no hay cadena a proposito. Lo que ancla el
    -- periodo borrado es sello_diario, ya commiteado a git.
    RETURN QUERY SELECT 'log_acceso'::text, v_corte, v_n, NULL::text, NULL::text;
END;
$fn$;

COMMENT ON FUNCTION fn_purgar_log_acceso(integer) IS
    'Purga el log de accesos degradado. Sin hashes de cadena: en esta tabla el ancla es el sello diario, no una cadena por fila.';


CREATE OR REPLACE FUNCTION fn_purgar_log_tecnico(p_dias integer DEFAULT 90)
RETURNS TABLE(tabla text, corte timestamptz, filas_borradas bigint,
              hash_ultimo_borrado text, hash_primero_conservado text)
LANGUAGE plpgsql AS $fn$
DECLARE
    v_corte timestamptz;
    v_n     bigint;
BEGIN
    IF p_dias IS NULL OR p_dias < 1 THEN
        RAISE EXCEPTION 'fn_purgar_log_tecnico: p_dias debe ser >= 1 (recibido: %)', p_dias;
    END IF;
    -- El estrato tecnico es el unico que NO deberia poder alargarse por descuido: si
    -- alguien pasa 3650, la IP cruda vive diez años. El tope es una decision escrita.
    IF p_dias > 365 THEN
        RAISE EXCEPTION 'fn_purgar_log_tecnico: p_dias=% excede el tope del estrato tecnico '
                        '(365). La IP cruda y el user-agent completo no se conservan mas de un '
                        'año: para eso existe la version degradada en log_acceso', p_dias;
    END IF;
    v_corte := now() - make_interval(days => p_dias);

    PERFORM set_config('coipo.purga_autorizada', 'on', true);
    DELETE FROM log_acceso_tecnico WHERE creado_en < v_corte;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    PERFORM set_config('coipo.purga_autorizada', 'off', true);

    RETURN QUERY SELECT 'log_acceso_tecnico'::text, v_corte, v_n, NULL::text, NULL::text;
END;
$fn$;

COMMENT ON FUNCTION fn_purgar_log_tecnico(integer) IS
    'Purga el estrato tecnico (IP cruda y user-agent completo). Tope duro de 365 dias: alargarlo por parametro seria convertir el estrato corto en uno largo sin decirlo.';


-- ============================================================================
-- 11. fn_sellar_dia — EL SELLO QUE SE COMMITEA
-- ============================================================================
--
-- Se llama a las 03:50 para el dia ANTERIOR (fecha civil de America/Santiago: el corte
-- se calcula sobre la fecha que aparece en el acto administrativo; con UTC, un sello de
-- las 21:00 cerraria un dia que en Chile aun no termino).
--
-- El sello NO se pisa: si el dia ya esta sellado, devuelve `ya_sellado` y no toca nada.
--
-- Para log_acceso el hash se calcula PLEGANDO fila a fila en un bucle, no con
-- `string_agg`: un dia de esa tabla son cientos de miles de filas y `string_agg` las
-- materializa todas en memoria del backend. El bucle es O(n) en tiempo y O(1) en memoria,
-- corre una vez al dia y de madrugada, y ese es el compromiso correcto en un servidor
-- compartido con otras aplicaciones.
CREATE OR REPLACE FUNCTION fn_sellar_dia(p_tabla text, p_fecha date)
RETURNS TABLE(sellado boolean, filas_selladas bigint, hash_resultante text, motivo text)
LANGUAGE plpgsql AS $fn$
DECLARE
    v_desde   timestamptz;
    v_hasta   timestamptz;
    v_filas   bigint  := 0;
    v_primer  bigint;
    v_ultimo  bigint;
    v_hash    text;
    v_fila    record;
BEGIN
    IF p_tabla NOT IN ('log_auditoria','log_acceso') THEN
        RAISE EXCEPTION 'fn_sellar_dia: tabla no sellable: %', p_tabla;
    END IF;

    IF EXISTS (SELECT 1 FROM sello_diario WHERE tabla = p_tabla AND fecha = p_fecha) THEN
        RETURN QUERY SELECT false, 0::bigint, NULL::text,
                            'ya_sellado: un sello no se reescribe'::text;
        RETURN;
    END IF;

    v_desde := (p_fecha::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Santiago';
    v_hasta := ((p_fecha + 1)::text || ' 00:00:00')::timestamp AT TIME ZONE 'America/Santiago';

    IF p_tabla = 'log_auditoria' THEN
        -- La cadena ya hace el trabajo: el sello del dia es el hash de cierre, es decir
        -- el hash_fila de la ultima fila del dia. Cualquier alteracion de una fila
        -- anterior cambia ese valor.
        SELECT count(*), min(id), max(id) INTO v_filas, v_primer, v_ultimo
        FROM log_auditoria WHERE creado_en >= v_desde AND creado_en < v_hasta;

        IF v_filas = 0 THEN
            -- Un dia sin actos NO se salta: se sella el vacio. Un hueco en la serie de
            -- fechas del .jsonl tiene que significar "no se sello", no "no hubo nada".
            v_hash := fn_sha256_hex('vacio' || E'\x1f' || p_tabla || E'\x1f' || p_fecha::text);
        ELSE
            SELECT hash_fila INTO v_hash FROM log_auditoria WHERE id = v_ultimo;
        END IF;

    ELSE
        v_hash := fn_sha256_hex('genesis' || E'\x1f' || p_tabla || E'\x1f' || p_fecha::text);
        FOR v_fila IN
            SELECT id, request_id, metodo, ruta, status_code, duracion_ms,
                   ip_red, ua_familia, actor_funcionario, actor_rol, actor_seudonimo,
                   creado_en
            FROM log_acceso
            WHERE creado_en >= v_desde AND creado_en < v_hasta
            ORDER BY id
        LOOP
            v_filas := v_filas + 1;
            IF v_primer IS NULL THEN v_primer := v_fila.id; END IF;
            v_ultimo := v_fila.id;
            v_hash := fn_sha256_hex(v_hash || E'\x1e' || concat_ws(E'\x1f',
                v_fila.id::text,
                to_char(v_fila.creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
                v_fila.request_id::text,
                v_fila.metodo,
                v_fila.ruta,
                v_fila.status_code::text,
                v_fila.duracion_ms::text,
                coalesce(v_fila.ip_red::text, '\N'),
                coalesce(v_fila.ua_familia, '\N'),
                coalesce(v_fila.actor_funcionario, '\N'),
                coalesce(v_fila.actor_rol, '\N'),
                coalesce(v_fila.actor_seudonimo, '\N')
            ));
        END LOOP;
    END IF;

    INSERT INTO sello_diario (tabla, fecha, filas, primer_id, ultimo_id, hash_sello, hash_version)
    VALUES (p_tabla, p_fecha, v_filas, v_primer, v_ultimo, v_hash, 1);

    RETURN QUERY SELECT true, v_filas, v_hash, NULL::text;
END;
$fn$;

COMMENT ON FUNCTION fn_sellar_dia(text, date) IS
    'Calcula y guarda el sello del dia para log_auditoria (hash de cierre de la cadena) o log_acceso (plegado incremental). No pisa un sello existente. La fila resultante se exporta a docs/cumplimiento/sellos/AAAA-MM.jsonl y se commitea desde el runner.';


-- ============================================================================
-- 12. VERIFICACION DE FORMA — EL ANTIDOTO AL NO-OP SILENCIOSO (D-15)
-- ============================================================================
--
-- `CREATE TABLE IF NOT EXISTS` sobre una tabla que YA existe con otras columnas no falla:
-- no hace nada. Ese es el fallo de D-15 en su forma mas pura — el desarrollador ve su
-- cambio aplicado en local, el CI pasa, el despliegue sale verde y la columna no existe
-- en produccion, sin un error, sin un log y sin una señal.
--
-- Este bloque cierra ese agujero: si la base quedo con una forma distinta de la que este
-- archivo declara, la migracion FALLA aqui, ruidosamente, nombrando exactamente lo que
-- falta. Es barato (lee catalogos) y corre una sola vez.
DO $verificacion$
DECLARE
    v_faltan text[] := '{}';
    v_par     text;
    v_esperado constant text[] := ARRAY[
        'catalogo_evento.codigo','catalogo_evento.clase','catalogo_evento.criticidad',
        'catalogo_evento.regimen','catalogo_evento.retencion','catalogo_evento.finalidad',
        'catalogo_evento.base_legal','catalogo_evento.campos_detalle','catalogo_evento.retirado_en',
        'log_auditoria.id','log_auditoria.actor_funcionario','log_auditoria.actor_ciudadano_id',
        'log_auditoria.actor_rol','log_auditoria.accion','log_auditoria.entidad',
        'log_auditoria.entidad_id_num','log_auditoria.detalle','log_auditoria.valores_previos',
        'log_auditoria.resultado','log_auditoria.request_id','log_auditoria.ip',
        'log_auditoria.user_agent','log_auditoria.creado_en','log_auditoria.hash_previo',
        'log_auditoria.hash_fila','log_auditoria.hash_version','log_auditoria.hash_origen',
        'log_acceso.id','log_acceso.request_id','log_acceso.metodo','log_acceso.ruta',
        'log_acceso.ruta_params','log_acceso.query','log_acceso.status_code',
        'log_acceso.duracion_ms','log_acceso.ip_red','log_acceso.ua_familia',
        'log_acceso.actor_funcionario','log_acceso.actor_rol','log_acceso.actor_seudonimo',
        'log_acceso.creado_en',
        'log_acceso_tecnico.id','log_acceso_tecnico.request_id','log_acceso_tecnico.ip',
        'log_acceso_tecnico.user_agent','log_acceso_tecnico.creado_en',
        'retencion_ejecucion.id','retencion_ejecucion.aplicacion','retencion_ejecucion.job',
        'retencion_ejecucion.ejecutado_en','retencion_ejecucion.fin',
        'retencion_ejecucion.corte_aplicado','retencion_ejecucion.filas_afectadas',
        'retencion_ejecucion.version_catalogo','retencion_ejecucion.sha256_script',
        'retencion_ejecucion.resultado','retencion_ejecucion.codigo_error',
        'retencion_ejecucion.hash_ultimo_borrado','retencion_ejecucion.hash_primero_conservado',
        'sello_diario.tabla','sello_diario.fecha','sello_diario.filas','sello_diario.hash_sello'
    ];
BEGIN
    FOREACH v_par IN ARRAY v_esperado LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema::text = current_schema()::text
              AND table_name::text   = split_part(v_par, '.', 1)
              AND column_name::text  = split_part(v_par, '.', 2)
        ) THEN
            v_faltan := v_faltan || v_par;
        END IF;
    END LOOP;

    IF array_length(v_faltan, 1) IS NOT NULL THEN
        RAISE EXCEPTION 'La base NO tiene la forma que declara 0000_plataforma.sql. Faltan: %. '
                        'Esto es el no-op silencioso de D-15: alguna de estas tablas ya existia '
                        'con otra forma y el CREATE TABLE IF NOT EXISTS no hizo nada',
            array_to_string(v_faltan, ', ');
    END IF;

    -- Los cuatro guards que sostienen las promesas ante Contraloria. Si alguno no esta,
    -- la tabla es una tabla de datos, no un log.
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_auditoria_inmutable') THEN
        RAISE EXCEPTION 'falta el trigger de inmutabilidad de log_auditoria';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_auditoria_no_truncate') THEN
        RAISE EXCEPTION 'falta el trigger anti-TRUNCATE de log_auditoria';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_log_auditoria_cadena') THEN
        RAISE EXCEPTION 'falta el trigger de cadena hash de log_auditoria';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_auditoria_catalogo'
                      AND conrelid = 'log_auditoria'::regclass) THEN
        RAISE EXCEPTION 'falta la FK log_auditoria.accion -> catalogo_evento (cerrojo 2 de D-20)';
    END IF;

    IF (SELECT valor FROM plataforma_capacidad WHERE clave = 'hash_de_auditoria') <> 'base' THEN
        RAISE WARNING 'CADENA DEGRADADA: el hash lo calculara la aplicacion y ES FORJABLE POR ELLA. '
                      'Abrir ficha en DEUDA.md. Ver plataforma_capacidad.';
    END IF;
END;
$verificacion$;

-- ============================================================================
-- FIN DE 0000_plataforma.sql
--
-- LO QUE ESTE ARCHIVO NO HACE, DICHO AQUI PARA QUE NADIE LO SUPONGA
-- -----------------------------------------------------------------
--  * No siembra catalogo_evento. Eso ocurre en el `lifespan` de la app, desde
--    catalogos/eventos.yaml, dentro del advisory lock del arranque. Hasta entonces la
--    tabla esta vacia y NINGUN insert de auditoria pasa la FK: es intencionado, y es un
--    fallo de DATOS que se reporta en /health/detalle, nunca un 503 en /health.
--  * No crea la FK de actor_ciudadano_id. La plataforma no conoce la tabla del titular;
--    la añade db/0001_dominio.sql y j10 verifica que exista.
--  * No crea el ledger de migraciones. Es del motor de migraciones
--    (adaptadores/salida/postgres/migraciones.py), y este archivo es su fila 0000.
--  * No otorga permisos. En 172.31.2.40 el rol lo asigna el DBA; el modelo de este
--    esquema asume UN rol de aplicacion que es dueño de las tablas.
--  * No protege del DBA. Ver la cabecera: eso lo hace el sello anclado en git, no el
--    trigger.
-- ============================================================================

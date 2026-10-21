"""Almacenamiento de objetos (MinIO/S3). Entra en la retención, no solo en la subida."""

from typing import BinaryIO, Protocol


class AlmacenDeArchivos(Protocol):
    """Guarda, entrega y BORRA objetos.

    POR QUÉ `eliminar` NO ES OPCIONAL
    ---------------------------------
    Porque sin él la retención miente. Hoy, en `COIPO_ENTREGA_PLANTA`, la guía de despacho
    —un PDF con nombre y RUT— vive en MinIO y NO SE TOCA NUNCA: la fila queda «anonimizada»
    con un enlace a un PDF que sigue trayendo el RUT. Un plan de retención que solo sabe
    escribir columnas a NULL deja fuera exactamente los datos que están en los archivos, que
    son los más difíciles de encontrar después.

    Por eso `eliminar()` está en el puerto y la acción `eliminar_objeto` existe en la
    gramática del plan de retención: el job de retención recibe este puerto igual que recibe
    el repositorio.

    `entregar_temporal` devuelve una URL firmada de corta duración en vez de que el backend
    haga de proxy del binario: un archivo de 25 MB atravesando el proceso ocupa un worker de
    los dos que hay durante toda la descarga.
    """

    def guardar(self, ruta: str, contenido: BinaryIO, *, tipo_mime: str) -> str: ...

    def abrir(self, ruta: str) -> BinaryIO: ...

    def entregar_temporal(self, ruta: str, *, segundos: int) -> str: ...

    def eliminar(self, ruta: str) -> bool:
        """`True` si borró, `False` si no estaba. No levanta por ausencia.

        Que la ausencia no sea un error es lo que permite que el job de retención sea
        reejecutable: si se cayó a la mitad, la segunda pasada encuentra objetos ya borrados
        y tiene que poder seguir en vez de morir en el primero.
        """

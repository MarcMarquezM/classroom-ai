# Como correr el BackEnd:

Para poder correr el backend de FastAPI que se encuentra en ***server.py*** se tienen que seguir los siguientes pasos:

## Descargar OBDC Drivers

Para conectarte a la base de datos de Azure SQL, necesitarás instalar el Driver ODBC para SQL Server. Si aún no lo has hecho, sigue las instrucciones de
instalación para tu sistema operativo. **Asegúrate de descargar la versión 18**:  
[MS OBDC Drivers](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16#download-for-linux-and-macos)

## Descargar las bibliotecas necesarias

Antes de poder ejecutar el servidor, debes instalar las bibliotecas de Python necesarias que se enumeran en el archivo "requirements.txt". Para hacerlo, abre tu
terminal y navega hasta el directorio donde se encuentra el archivo "requirements.txt".

```
pip3 install -r requirements.txt
```

### Biblioteca pyodbc en sistemas MacOS

Para poder correr esta biblioteca afuera del uso con Azure SQL y sus drivers necesarios (del punto anterior), es recomendado descargar el driver unixODBC.

```
brew install unixODBC
```

### Errores de pyodbc

Si se presenta un error asi o similar al correr ***server.py*** el cual dice:

```
(0x0002): symbol not found in flat namespace '_SQLAllocHandle'
```

Borra la instalación de pyodbc y vuelve a descargarlo en la terminal de la siguiente manera:

```
pip3 install --no-binary :all: pyodbc
```

### Correr Redis para Websocket sessions

Los datos de los estudiantes en una sesión dentro del websocket se guardan en una base de datos de Redis.  
Para instalar Redis en sistemas MacOS, utilizamos Homebrew.

```
brew install redis
```

Parra correrlo ponemos en la terminal

```
brew services start redis
```

Para detener Redis, corremos:

```
brew services stop redis
```

## Correr el servidor

El archivo ya está configurado para correr el servidor con simplemente correr ***server.py***:

```
python3 server.py
```

## **Nota: versión de python utilizada en el proyecto es 3.11**


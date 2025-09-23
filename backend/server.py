# Web Framework
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
import uvicorn
import json
# API Response Handling
from fastapi.responses import JSONResponse
from fastapi import HTTPException
# Middleware
from fastapi.middleware.cors import CORSMiddleware
# File Upload
from fastapi import File, UploadFile
# Cloud Storage
from azure.storage.blob import BlobServiceClient
# Database Connectivity
from sqlalchemy import create_engine, URL
# Asynchronous
import asyncio
from multiprocessing import Process
# Environment Variables
from dotenv import load_dotenv
# OS Handling
import os
# Image Processing
import io
import cv2 as cv
from PIL import Image
import face_recognition as face_rec
# Numeric Processing
import numpy as np
# Time Handling
import time
from passlib.hash import argon2
# logging
import logging
# Redis
import redis
# Model
from Model import Model

logging.basicConfig(level=logging.INFO)

# Load variables from env file
load_dotenv()
port = int(os.getenv('API_SERVER_PORT'))
driver = '{ODBC Driver 18 for SQL Server}'
server = os.getenv('DB_SERVER')
database = os.getenv('DB_SERVER_DATABASE_NAME')
username = os.getenv('DB_SERVER_USER')
password = os.getenv('DB_SERVER_PASS')
conn_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
container_name = os.getenv('AZURE_STORAGE_CONTAINER_NAME')

odbc_conn = f'DRIVER={driver};SERVER={server};PORT=1433;DATABASE={database};UID={username};PWD={password}'
connection_url = URL.create(
    drivername="mssql+pyodbc",
    query={
        "odbc_connect": odbc_conn
    }
)

engine = create_engine(connection_url)
blob_service_client = BlobServiceClient.from_connection_string(conn_string)
container_client = blob_service_client.get_container_client(container_name)

# Constants
DB_TIME_LIMIT = 300  # Five minutes
ASSISTANCE_TIME_LIMIT = 600  # Ten minutes

# Create FastAPI instance
app = FastAPI()

# Define CORS settings
origins = [
    "https://main.d53xmpa1mpf4x.amplifyapp.com",
    "http://localhost:3000",
    "https://classroomai.taurithm.com"
]  # Change this to the allowed origins of your application

# Add the CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # You can specify specific HTTP methods here (e.g., ["GET", "POST"])
    allow_headers=["*"],  # You can specify specific HTTP headers here (e.g., ["Authorization"])
)


# Function to send return the payload
def res(status: int, success: bool, data: any):
    content = {'success': success, 'data': data}
    return JSONResponse(content=content, status_code=status)


# Function to format the HTTPException to the res() function
@app.exception_handler(HTTPException)
async def exception_handler(_, exc: HTTPException):
    return res(status=exc.status_code, success=False, data={'error': exc.detail})


# ======================================================GET METHODS===================================================

# Get all students from this course
@app.get('/courses/{course_id}/students')
async def get_students(course_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query to get students associated with the course_id from the StudentCourseRelation table
        query = '''
            SELECT s.StudentID, s.FirstName, s.LastName, s.RoleID, s.Email
            FROM Student s
            JOIN StudentCourseRelation scr ON s.StudentID = scr.StudentID
            WHERE scr.CourseID = ?
        '''
        cursor.execute(query, (course_id,))
        students = cursor.fetchall()

        # Convert the list of tuples into a list of dictionaries to send back
        students = [dict(zip([column[0] for column in cursor.description], row)) for row in students]

        return res(status=200, success=True, data=students)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.get('/students')
async def get_students_list():
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query
        cursor.execute('SELECT StudentID, FirstName, LastName, RoleID, Email FROM Student')
        students = cursor.fetchall()
        # We convert list of tuples into a dict to send back
        students = [dict(zip([column[0] for column in cursor.description], row)) for row in students]

        return res(status=200, success=True, data=students)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Get all courses for User
@app.get('/courses/{user_id}')
async def get_courses(user_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query
        query = 'SELECT * FROM Course WHERE UserID = ?'
        cursor.execute(query, (user_id,))
        courses = cursor.fetchall()
        # We convert list of tuples into a dict to send back
        courses = [dict(zip([column[0] for column in cursor.description], row)) for row in courses]

        return res(status=200, success=True, data=courses)
    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Get all courses for student
@app.get('/courses/{email}/users')
async def get_courses(email: str):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = '''
            SELECT c.*
            FROM Course c
            JOIN StudentCourseRelation scr ON c.CourseID = scr.CourseID
            JOIN Student s ON s.StudentID = scr.StudentID
            WHERE s.Email = ?
        '''
        cursor.execute(query, (email,))
        courses = cursor.fetchall()

        courses = [dict(zip([column[0] for column in cursor.description], row)) for row in courses]

        return res(status=200, success=True, data=courses)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Get all professors from this course
@app.get('/courses/{course_id}/professors')
async def get_professors(course_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query
        query = 'SELECT * FROM Professor WHERE CourseID = ?'
        cursor.execute(query, (course_id,))
        professors = cursor.fetchall()
        # We convert list of tuples into a dict to send back
        professors = [dict(zip([column[0] for column in cursor.description], row)) for row in professors]

        return res(status=200, success=True, data=professors)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Get Users
@app.get('/users')
async def get_users():
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query
        query = 'SELECT * FROM ProfessorsUsers'
        cursor.execute(query)
        users = cursor.fetchall()
        # We convert list of tuples into a dict to send back
        users = [dict(zip([column[0] for column in cursor.description], row)) for row in users]

        return res(status=200, success=True, data=users)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post('/participation/assistance/{course_id}/{date}')
async def get_participation_assistance(course_id: int, date: str, req: Request):
    conn = None
    cursor = None
    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()
        student_data_list = await req.json()

        result_data = []
        for student_data in student_data_list:
            student_id = student_data.get('StudentID')
            cursor.execute("""
                SELECT 
                    COALESCE(A.AssistanceCount, 0) AS AssistanceCount, 
                    COALESCE(P.ParticipationCount, 0) AS ParticipationCount 
                FROM 
                    Assistance AS A
                FULL JOIN 
                    Participation AS P 
                    ON A.StudentID = P.StudentID AND A.CourseID = P.CourseID AND A.AssistanceDate = P.ParticipationDate
                WHERE 
                    (A.StudentID = ? AND A.CourseID = ? AND A.AssistanceDate = ?) OR 
                    (P.StudentID = ? AND P.CourseID = ? AND P.ParticipationDate = ?)
            """, (student_id, course_id, date, student_id, course_id, date))

            student_result = cursor.fetchall()
            student_result_dict = [dict(zip([column[0] for column in cursor.description], row)) for row in student_result]
            result_data.append({"StudentID": student_id, "Data": student_result_dict, "Date": date})

        return JSONResponse(content={"success": True, "data": result_data}, status_code=200)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post('/dateranges/{course_id}/{dates}')
async def get_date_ranges(
        course_id: int,
        dates: str,
        req: Request
):
    conn = None
    cursor = None
    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()
        student_data_list = await req.json()
        start_date, end_date = map(str, dates.split(','))

        cursor.execute("""
            SELECT DISTINCT AssistanceDate 
            FROM Assistance 
            WHERE CourseID = ? AND AssistanceDate BETWEEN ? AND ?
        """, (course_id, start_date, end_date))

        distinct_dates = [str(row[0]) for row in cursor.fetchall()]

        result_data = {}

        for student_data in student_data_list:
            student_id = student_data.get('StudentID')
            cursor.execute("""
                SELECT AssistanceDate, SUM(AssistanceCount) as TotalAssistance, SUM(ParticipationCount) as TotalParticipation
                FROM (
                    SELECT AssistanceDate, AssistanceCount, 0 as ParticipationCount
                    FROM Assistance
                    WHERE CourseID = ? AND StudentID = ? AND AssistanceDate BETWEEN ? AND ?

                    UNION ALL

                    SELECT ParticipationDate as AssistanceDate, 0 as AssistanceCount, ParticipationCount
                    FROM Participation
                    WHERE CourseID = ? AND StudentID = ? AND ParticipationDate BETWEEN ? AND ?
                ) AS combined_data
                WHERE AssistanceDate IS NOT NULL
                GROUP BY AssistanceDate
            """, (course_id, student_id, start_date, end_date, course_id, student_id, start_date, end_date))

            for row in cursor.fetchall():
                date, total_assistance, total_participation = row
                if date not in result_data:
                    result_data[date] = {"AssistanceCount": 0, "ParticipationCount": 0}

                result_data[date]["AssistanceCount"] += total_assistance
                result_data[date]["ParticipationCount"] += total_participation

        final_result_data = [{"Date": str(date), "AssistanceCount": data["AssistanceCount"],
                              "ParticipationCount": data["ParticipationCount"]} for date, data in result_data.items()]

        return JSONResponse(content={"success": True, "data": final_result_data}, status_code=200)

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.get('/session/count/{course_id}')
async def get_session_count(course_id: int):
    conn = None
    cursor = None
    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Execute SQL query
        cursor.execute('SELECT SessionCount FROM Course WHERE CourseID = ?', (course_id,))
        row = cursor.fetchone()

        if row:
            session_count = row[0]
            return res(status=200, success=True, data={'CourseID': course_id, 'SessionCount': session_count})
        else:
            return res(status=404, success=False, data={'message': 'CourseID not found'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ======================================================POST METHODS===================================================

# Create a new course
@app.post('/courses/{user_id}')
async def add_course(user_id: int, req: Request):
    conn = None
    cursor = None

    try:
        course_data = await req.json()
        course_name = course_data.get('CourseName')
        if course_name is None or user_id is None:
            logging.info("No course name")
            raise HTTPException(status_code=400, detail="CourseName field is required")

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = """
        SET NOCOUNT ON;
        DECLARE @CourseID INT;
        EXEC AddCourse @CourseName = ?, @UserID = ?, @CourseID = @CourseID OUTPUT;
        SELECT @CourseID as CourseID;
        """

        # Execute stored procedure
        cursor.execute(query, (course_name, user_id))

        # Fetch the output parameter
        course_id = cursor.fetchone()[0]
        conn.commit()

        return res(status=200, success=True,
                   data={'message': 'Course added successfully', 'CourseID': course_id, 'UserID': user_id, })

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Add all students to this course
@app.post('/courses/{course_id}/students')
async def add_students(course_id: int, req: Request):
    conn = None
    cursor = None

    try:
        body = await req.json()
        first_name = body.get('FirstName')
        last_name = body.get('LastName')
        email = body.get('Email')

        if not first_name or not last_name or not email:
            raise HTTPException(status_code=400, detail="Both Email / FirstName and LastName fields are required")

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = 'EXEC AddStudents @FirstName=?, @LastName=?, @Email = ?'
        cursor.execute(query, (first_name, last_name, email))
        conn.commit()

        query1 = 'SELECT StudentID FROM Student WHERE Email = ?'
        cursor.execute(query1, (email,))
        student_record = cursor.fetchone()

        student_id = student_record[0]

        query2 = 'INSERT INTO StudentCourseRelation (StudentID, CourseID) VALUES (?, ?)'
        cursor.execute(query2, (student_id, course_id))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Student added to the course successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post('/courses/students/add')
async def add_students(req: Request):
    conn = None
    cursor = None

    try:
        body = await req.json()
        first_name = body.get('FirstName')
        last_name = body.get('LastName')
        email = body.get('Email')
        image_data = body.get('Img')
        image_response = image_data['file']['response'].encode('utf-8')
        if image_response:
            image_stream = io.BytesIO(image_response)
            container_client.upload_blob(name=email, data=image_stream)
            logging.info(f"Image '{email}' uploaded successfully.")
        else:
            logging.info("No image data received.")


        if not first_name or not last_name or not email:
            raise HTTPException(status_code=400, detail="Both Email / FirstName and LastName fields are required")

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = 'EXEC AddStudents @FirstName=?, @LastName=?, @Email = ?'
        cursor.execute(query, (first_name, last_name, email))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Student added successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Add professor to this course
@app.post('/courses/{course_id}/professors')
async def add_professor(course_id: int, req: Request):
    conn = None
    cursor = None

    try:
        body = await req.json()
        professor_name = body.get('ProfessorName')

        if not professor_name:
            raise HTTPException(status_code=400, detail="Professor name field is required")

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = 'EXEC AddProfessor @ProfessorName=?, @CourseID=?'
        cursor.execute(query, (professor_name, course_id))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Professor added to the course successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Add User
@app.post('/users')
async def add_user(req: Request):
    conn = None
    cursor = None

    try:
        user_data = await req.json()
        email = user_data.get('Email')
        password = user_data.get('PasswordHash')  # Change 'PasswordHash' to 'Password'
        role_id = user_data.get('RoleID')

        # Hash the password using passlib and argon2
        hashed_password = argon2.hash(password)

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query1 = 'SELECT COUNT(*) FROM ProfessorsUsers WHERE Email = ?'
        cursor.execute(query1, (email,))
        if cursor.fetchone()[0] > 0:
            raise HTTPException(status_code=400, detail="Email already exists")

        query2 = 'INSERT INTO ProfessorsUsers (Email, PasswordHash, RoleID) VALUES (?, ?, ?)'
        cursor.execute(query2, (email, hashed_password, role_id))
        conn.commit()

        return res(status=200, success=True, data={'message': 'User added successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post('/users/login')
async def login_user(req: Request):
    conn = None
    cursor = None

    try:
        user_data = await req.json()
        user_email = user_data.get('Email')
        user_password = user_data.get('Password')

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = 'SELECT UserID, RoleID, PasswordHash FROM ProfessorsUsers WHERE Email = ?'
        cursor.execute(query, (user_email,))
        user_data = cursor.fetchone()

        if user_data:
            user_id, role_id, hashed_password = user_data

            # Verify the provided plain-text password against the stored hashed password
            if argon2.verify(user_password, hashed_password):
                return res(status=200, success=True,
                           data={'message': 'User exists and credentials are correct', 'RoleID': role_id,
                                 'UserID': user_id})
            else:
                return res(status=401, success=False, data={'message': 'Invalid email or password'})
        else:
            return res(status=401, success=False, data={'message': 'Invalid email or password'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.post('/students/login')
async def login_user(req: Request):
    conn = None
    cursor = None

    try:
        student_data = await req.json()
        email = student_data.get('Email')

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query = 'SELECT StudentID, RoleID FROM Student WHERE Email = ?'
        cursor.execute(query, (email,))

        student = cursor.fetchone()

        if student:
            user_id, role_id = student

            return res(status=200, success=True,
                       data={'message': 'User exists and credentials are correct', 'RoleID': role_id, 'Email': email, })
        else:
            return res(status=401, success=False, data={'message': 'Invalid email or password'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ======================================================PUT METHODS===================================================


@app.put('/session/count/{course_id}')
async def add_session(course_id: int):
    conn = None
    cursor = None

    try:
        if not course_id:
            raise HTTPException(status_code=400, detail="Select a Course")
        conn = engine.raw_connection()
        cursor = conn.cursor()

        cursor.execute("EXEC IncrementSessionCount @course_id = ?", (course_id,))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Session counted successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Update User
@app.put('/users/{user_id}')
async def update_user(user_id: int, req: Request):
    conn = None
    cursor = None

    try:
        user_data = await req.json()
        new_email = user_data.get('Email')
        new_password = user_data.get('PasswordHash')  # Change 'PasswordHash' to 'Password'
        new_role_id = user_data.get('RoleID')

        # Hash the new password using passlib and argon2
        new_password_hash = argon2.hash(new_password)

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query1 = 'SELECT COUNT(*) FROM ProfessorsUsers WHERE UserID = ?'
        cursor.execute(query1, (user_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="User not found")

        query2 = 'UPDATE ProfessorsUsers SET Email = ?, PasswordHash = ?, RoleID = ? WHERE UserID = ?'
        cursor.execute(query2, (new_email, new_password_hash, new_role_id, user_id))
        conn.commit()

        return res(status=200, success=True, data={'message': 'User updated successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.put('/student/{student_id}')
async def update_student(student_id: int, req: Request):
    conn = None
    cursor = None

    try:
        user_data = await req.json()
        new_email = user_data.get('Email')
        new_first_name = user_data.get('FirstName')
        new_last_name = user_data.get('LastName')

        conn = engine.raw_connection()
        cursor = conn.cursor()

        query1 = 'SELECT COUNT(*) FROM Student WHERE StudentID = ?'
        cursor.execute(query1, (student_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Student not found")

        query2 = 'UPDATE Student SET Email = ?, FirstName = ?, LastName = ? WHERE StudentID = ?'
        cursor.execute(query2, (new_email, new_first_name, new_last_name, student_id))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Student updated successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.put('/data/student/{course_id}/{student_id}/{date}')
async def update_student_data(course_id: int, student_id: int, date: str, req: Request):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()
        student_data = await req.json()
        assistance_count = student_data.get('AssistanceCount')
        participation_count = student_data.get('ParticipationCount')

        query1 = 'SELECT COUNT(*) FROM Participation WHERE CourseID = ? AND StudentID = ? AND ParticipationDate = ?'
        cursor.execute(query1, (course_id, student_id, date))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Student not found")

        query2 = 'SELECT COUNT(*) FROM Assistance WHERE CourseID = ? AND StudentID = ? AND AssistanceDate = ?'
        cursor.execute(query2, (course_id, student_id, date))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="Student not found")

        query3 = 'UPDATE Assistance SET AssistanceCount = ? WHERE CourseID = ? AND StudentID = ? AND AssistanceDate = ?'
        cursor.execute(query3, (assistance_count, course_id, student_id, date))
        conn.commit()

        query4 = 'UPDATE Participation SET ParticipationCount = ? WHERE CourseID = ? AND StudentID = ? AND ParticipationDate = ?'
        cursor.execute(query4, (participation_count, course_id, student_id, date))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Student updated successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.put('/assign-course/{course_id}')
async def assign_course(course_id: int, request: Request):
    conn = None
    cursor = None

    try:
        student_data = await request.json()
        student_emails = student_data.get('Email')

        conn = engine.raw_connection()
        cursor = conn.cursor()

        for email in student_emails:
            query = 'SELECT StudentID FROM Student WHERE Email = ?'
            cursor.execute(query, (email,))
            student_record = cursor.fetchone()

            if not student_record:
                raise HTTPException(status_code=404, detail=f"Student with email {email} not found")

            student_id = student_record[0]

            # Insert student-course relation
            query = 'INSERT INTO StudentCourseRelation (StudentID, CourseID) VALUES (?, ?)'
            cursor.execute(query, (student_id, course_id))

        conn.commit()

        return {"success": True, "message": "Students updated successfully"}

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ======================================================DELETE METHODS=================================================

# Delete a course
@app.delete('/courses/{course_id}')
async def del_course(course_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Comenzar transaction
        cursor.execute("BEGIN TRANSACTION")

        # Update de professors CourseID a NULL
        update_professors_course_query = "UPDATE Professor SET CourseID = NULL WHERE CourseID = ?"
        cursor.execute(update_professors_course_query, (course_id,))

        delete_student_participation_query = 'DELETE FROM Participation WHERE CourseID = ?'
        cursor.execute(delete_student_participation_query, (course_id,))
        conn.commit()

        delete_student_assistance_query = 'DELETE FROM Assistance WHERE CourseID = ?'
        cursor.execute(delete_student_assistance_query, (course_id,))
        conn.commit()

        # Remover la relacion de students con curso, sin eliminar el estudiante
        update_student_course_query = "DELETE FROM StudentCourseRelation WHERE CourseID = ?"
        cursor.execute(update_student_course_query, (course_id,))

        # Eliminar Course
        delete_course_query = "DELETE FROM Course WHERE CourseID = ?"
        cursor.execute(delete_course_query, (course_id,))

        # Commit
        cursor.execute("COMMIT TRANSACTION")
        conn.commit()

        return {"status": 200, "success": True, "message": "Course and related data deleted successfully"}

    except Exception as e:
        # Rollback
        if cursor:
            cursor.execute("ROLLBACK TRANSACTION")

        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        # Close connections
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Delete User
@app.delete('/users/{user_id}')
async def delete_user(user_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        query1 = 'SELECT COUNT(*) FROM ProfessorsUsers WHERE UserID = ?'
        cursor.execute(query1, (user_id,))
        if cursor.fetchone()[0] == 0:
            raise HTTPException(status_code=404, detail="User not found")

        query2 = 'DELETE FROM ProfessorsUsers WHERE UserID = ?'
        cursor.execute(query2, (user_id,))
        conn.commit()

        return res(status=200, success=True, data={'message': 'User deleted successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.delete('/student/{student_id}')
async def delete_student(student_id: int):
    conn = None
    cursor = None

    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        delete_student_participation_query = 'DELETE FROM Participation WHERE StudentID = ?'
        cursor.execute(delete_student_participation_query, (student_id,))
        conn.commit()

        delete_student_assistance_query = 'DELETE FROM Assistance WHERE StudentID = ?'
        cursor.execute(delete_student_assistance_query, (student_id,))
        conn.commit()

        update_student_course_query = "UPDATE StudentCourseRelation SET StudentID = NULL WHERE StudentID = ?"
        cursor.execute(update_student_course_query, (student_id,))

        # Delete de student
        delete_student_query = 'DELETE FROM Student WHERE StudentID = ?'
        cursor.execute(delete_student_query, (student_id,))
        conn.commit()

        return res(status=200, success=True, data={'message': 'Student deleted successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.delete('/image/{student_email}')
async def delete_student_img(student_email: str):
    try:
        blob_client = container_client.get_blob_client(student_email)
        blob_client.delete_blob()
        logging.info(f"Image '{student_email}' deleted successfully.")

        return res(status=200, success=True, data={'message': 'Student Image deleted successfully'})

    except Exception as e:
        logging.error(f'{e}')
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


# ======================================================WEBSOCKET METHODS==============================================


# Function to get the students info including id, name, email and image
def get_students_info(message: str) -> tuple:
    conn = None
    cursor = None
    students_info = {}
    try:
        received_data = json.loads(message)
        students = received_data.get("students")
        date = received_data.get("date")
        # Save the students
        for student in students:
            students_info[student['StudentID']] = {
                'name': student['FirstName'] + ' ' + student['LastName'],
                'email': student['Email'],
                'assistance': False,
                'assistance_sent': False,
                'participation_counter': 0,
            }

        # Get the students images
        for student_id, student_data in students_info.items():
            email = student_data['email']

            conn = engine.raw_connection()
            cursor = conn.cursor()

            select_query = "SELECT Image FROM Student WHERE Email = ?"
            cursor.execute(select_query, (email,))
            row = cursor.fetchone()

            if row and row.Image:
                image_data = row.Image
                image = Image.open(io.BytesIO(image_data))
                decompressed_image = image.convert("RGB")
                image_array = np.array(decompressed_image)
                image_encoding = face_rec.face_encodings(image_array)[0]

                students_info[student_id]['img'] = image_encoding

        return students_info, date

    except Exception as e:
        logging.error(f'Error getting students info: {e}')
        return {}, ""

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Send students_info info to the db
async def send_students_info_to_db(course_id: int, students_info: dict, date: str) -> None:
    conn = None
    cursor = None
    try:
        conn = engine.raw_connection()
        cursor = conn.cursor()

        for student_id, student_info in students_info.items():
            assistance_sent = student_info['assistance_sent']
            assistance = student_info['assistance']
            participation_counter = student_info['participation_counter']

            if not assistance_sent:
                query1 = "EXEC UpdateAssistanceCount @StudentID=?, @CourseID=?, @AssistanceCount=?, @AssistanceDate=?"
                cursor.execute(query1, (student_id, course_id, assistance, date))

            query2 = "EXEC UpdateParticipationCount @StudentID=?, @CourseID=?, @NewParticipationCount=?, @ParticipationDate=?"
            cursor.execute(query2, (student_id, course_id, participation_counter, date))

        conn.commit()

    except Exception as e:
        logging.info(f"An error occurred: {str(e)}")
        conn.rollback()

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# Function to run in parallel from the main process
def get_students_assistance(frame_container: list[np.ndarray], student_images: dict[str, np.ndarray], namespace: str) -> None:
    # Create a new Redis connection for this process
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    # Get all the students info
    students_info = {}
    student_pattern = f'{namespace}:student:*'
    for key in redis_client.scan_iter(student_pattern):
        # Extracting student_id from the key
        student_id = key.split(':')[-1]
        student_info = redis_client.hgetall(key)

        # Convert fields from string to their appropriate data types
        processed_info = {}
        for field, value in student_info.items():
            if value.isdigit():
                processed_info[field] = int(value)  # Convert to integer
            elif value in ['true', 'false']:
                processed_info[field] = value == 'true'  # Convert to boolean
            else:
                processed_info[field] = value  # Keep as string

        students_info[student_id] = processed_info

    # Process saved video frames to identify students and update their assistance status.
    for frame in frame_container:
        # Convert the image from BGR color (which OpenCV uses) to RGB color (which face_recognition uses)
        frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        # Find all the faces and face encodings in the current frame of video
        face_locations = face_rec.face_locations(frame)
        face_encodings = face_rec.face_encodings(frame, face_locations)
        # Separate the info into lists to add to face_recognition methods
        ids = [student_id for student_id, student_info in students_info.items() if student_info['assistance'] is False]
        faces = [student_images[student_id] for student_id in ids]
        # Iterate over the face encodings to find a match
        for face_encoding in face_encodings:
            # See if the face is a match for the known face(s)
            matches = face_rec.compare_faces(faces, face_encoding)
            try:
                # Get the index of the match
                index = matches.index(True)
                match_student_id = ids[index]
                # Change student's assistance to true in the Redis DB
                redis_client.hset(f'{namespace}:student:{match_student_id}', 'assistance', 'true')
                students_info[match_student_id]['assistance'] = True  # Mark as present locally

            except ValueError:
                # Silently ignore if `True` is not found in the list
                pass

    redis_client.close()  # Close the client connection
    redis_client.connection_pool.disconnect()  # Disconnect the connection pool


@app.websocket("/ws/{course_id}/{session_count}")
async def websocket_endpoint(course_id: int, session_count: int, websocket: WebSocket):
    await websocket.accept()
    logging.info(f'Comenzando conexión websocket en curso {course_id}, sesión {session_count}')
    # Initialize Model class
    model = Model(course_id=course_id, session_count=session_count)
    # Process initialization
    process = None

    try:
        # Get course info
        message = await websocket.receive_text()
        data, model.date = get_students_info(message)
        # Save students info to model and Redis DB
        model.save_data(data)

        if len(data) == 0:
            raise Exception('Error: No students info found')

        # Start assistance timer
        last_assistance_action_time = time.time()
        # Start DB timer
        last_db_action_time = time.time()

        while True:
            # Get current time
            current_time = time.time()
            # Receive image blob from WebSocket
            blob = await websocket.receive_bytes()
            # Convert blob to NumPy array and decode with OpenCV
            blob_np = np.frombuffer(blob, np.uint8)
            frame = cv.imdecode(blob_np, cv.IMREAD_COLOR)

            if frame is not None:
                # Increase frame counter
                model.frame_count += 1
                # Get all the poses and bounding box in the current frame
                results = model.yolo_model(frame, verbose=False)[0]
                # We only want to get the arms and shoulders of the pose
                model.model_detections['poses'] = results.keypoints.data[:, 0:11, :]
                model.model_detections['boxes'] = results.boxes.data

                # Check if all students have marked assistance
                if not model.finished_assistance:
                    model.finished_assistance = model.check_assistance()

                # Assistance checker
                if (current_time - last_assistance_action_time >= ASSISTANCE_TIME_LIMIT and
                        not model.finished_assistance and
                        len(model.frame_container) >= 10):
                    last_assistance_action_time = current_time
                    logging.info('Getting students assistance')

                    # Extract necessary data
                    frame_container = model.frame_container.copy()
                    student_images = model.student_images.copy()
                    namespace = model.namespace

                    # Run in a separate process
                    process = Process(target=get_students_assistance, args=(frame_container, student_images, namespace))
                    process.start()

                elif not model.finished_assistance and len(model.frame_container) < 10:
                    # We add a new frame to the container
                    model.frame_container.append(frame)

                # Send students info to DB
                if current_time - last_db_action_time >= DB_TIME_LIMIT:
                    last_db_action_time = current_time
                    # Get the students info to send
                    students_info = model.get_all_students_info()
                    # Run concurrently
                    asyncio.create_task(send_students_info_to_db(course_id, students_info, model.date))
                    for student_id, student_info in students_info.items():
                        # Reset participation counter
                        model.update_field(student_id, 'participation_counter', 0)
                        # Mark all assistance's as done
                        if student_info['assistance']:
                            model.update_field(student_id, 'assistance_sent', True)

                # Iterate over poses
                model.iterate_over_detections(frame=frame)

                # Detections cleanup process
                model.cleanup()

    except WebSocketDisconnect:
        logging.info('WebSocket disconnected')
        # Send last data of students
        students = model.get_all_students_info()
        await send_students_info_to_db(course_id, students, model.date)

    except Exception as e:
        # Close the websocket connection
        await websocket.close()
        logging.error(f'Error: {e}')

    finally:
        # Check if the assistance process is still running and terminate if necessary
        if process and process.is_alive():
            process.terminate()
            process.join()  # Wait for the process to terminate

        # Delete Redis session namespace
        model.delete_all_data()

        # Terminate Redis connection
        model.redis_client.close()  # Close the client connection
        model.redis_client.connection_pool.disconnect()  # Disconnect the connection pool


# ======================================================IMAGE METHODS==================================================

@app.post("/upload_student_image/{email}")
async def upload_student_image(email: str, image: UploadFile = File(...)):
    conn = None
    cursor = None
    try:
        # Create a cursor to perform database operations
        conn = engine.raw_connection()
        cursor = conn.cursor()

        # Read the uploaded image file
        contents = await image.read()

        query = 'SELECT StudentID FROM Student WHERE Email = ?'
        cursor.execute(query, (email,))
        student_record = cursor.fetchone()

        if not student_record:
            raise HTTPException(status_code=404, detail=f"Student with email {email} not found")

        student_id = student_record[0]

        # Save image data to the database for a specific student
        update_query = "UPDATE Student SET Image = ? WHERE StudentID = ?"
        cursor.execute(update_query, (contents, student_id))
        conn.commit()

        return {"message": "Image uploaded and associated with the student successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=80, reload=True)

# Correr en terminal: uvicorn random_forest_api:app --reload

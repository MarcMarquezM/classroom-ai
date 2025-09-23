# ClassroomAI
Real-time classroom analytics that detect attendance and hand-raise participation from a web camera stream, powered by YOLO pose and face recognition. Frontend in Next.js, backend in FastAPI with Redis and SQL Server.

![login-gif](https://github.com/user-attachments/assets/6be4afe8-e597-4f97-a751-47a86b23ed9e)


## Project Description
Classroom AI turns a standard webcam into an assistant for teachers:
* Participation: Detects a raised hand using human-pose keypoints and confirms the student’s identity with face recognition before crediting the event.
* Attendance: Every few minutes, the backend samples a short burst of frames and matches faces against the roster to mark who’s present.
* Management: Web app for courses, users, and students; session start/stop; per-student summaries.

## Frontend
**Tech:** JavaScript, Next.js, Ant Design, Axios, Firebase

### Class Session Orchestration
* A professor picks a course and a date, then starts a session.
* On start, the browser camera turns on and a WebSocket opens to the backend.
* The app sends a one-time “hello” payload containing the course roster and date so the server can preload student encodings.
* The camera then streams JPEG frames ~10 fps to the backend for pose and face processing.

### Roster & Image Management
* Professors can create/edit students, assign them to courses, and upload each student’s photo (sent as FormData to the backend).

### Session Summaries
* For a given course and date, the app fetches and displays participation and attendance counts per student.

## Backend
**Tech:** Python 3.11, FastAPI, YOLOv8-pose, OpenCV, face_recognition (dlib), Redis, Azure SQL, Azure Blob Storage

### Session model
* Each class run uses a course_id and monotonically increasing session_count.
* Redis namespace per session caches:
  * student encodings,
  * per-person detection state (counters, last seen),
  * participation/attendance flags.
* Periodic flush writes durable records to SQL.

### Real-time detection
1. Pose detection (YOLOv8-pose)
    * Filter low-confidence boxes/keypoints.
    * Compute arm angles and positions (shoulder/elbow/wrist) with hand raised detection algorithm.
    * Mark “hand raised” only if conditions hold for 20 consecutive frames to prevent false positives
2. Face recognition
    * When hand raise crosses previous threshold, we crop the face region using the box/keypoints and encode it.
    * We compare the encoded image to the session's students encodings
    * If we get a match, we mark that students participation.
3. Attendance checker
    * On a timer, collect 10 frames and run face matching in a separate worker.
    * Any match flips a student’s present flag for the session.
4. Flush & cleanup
    * On interval and on disconnect, write events to SQL and clean Redis keys.

### Architecture
<img width="941" height="549" alt="arch" src="https://github.com/user-attachments/assets/b9680824-8049-4073-a320-7c552bec9044" />

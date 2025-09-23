import React, { useRef, useEffect, useState } from "react";
import { Button, Card, Row, message as antdMessage } from "antd";
import APIController from "@/hooks/APIController";
import { useDate } from "@/hooks/DateContext";

const Webcam = ({course, studentData}) => {
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const websocket = useRef(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { dateContext } = useDate();
  const port = process.env.NEXT_API_PORT;
  const host = process.env.NEXT_API_HOST;

  const fetchSessionCount = async () => {
    try {
      const response = await APIController.getSessionCount(course); 
      if(response.data.SessionCount === null){
        setSessionCount(0);
      }
      if (response.data && response.data.SessionCount) {
        setSessionCount(response.data.SessionCount); 
      }
    } catch (error) {
      console.error("Error fetching session count:", error);
    }
  };

  useEffect(() => {
    fetchSessionCount(); 
  }, [course]);

  // AUN EN TESTING
  const startCamera = async () => {
    if(dateContext === undefined){
      antdMessage.error('Elige una fecha')
    }
    else{
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      const updateSession = APIController.updateSessionCount(course)
      if(updateSession){
        fetchSessionCount(); 
        console.log("Session Counted")
      }else{
        console.log("Session not counted")
      }
      console.log(dateContext)
      websocket.current = new WebSocket(`ws://${host}:${port}/ws/${course}/${sessionCount}`);
      const courseData = {
        students: studentData,
        date: dateContext,
      };
      console.log(dateContext)
      websocket.current.onopen = () => {
        console.log("WebSocket connected");
        websocket.current.send(JSON.stringify(courseData));
        let canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;
        let ctx = canvas.getContext("2d");
        mediaRecorderRef.current = new MediaRecorder(stream);

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            // Draw the current video frame on canvas
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            // Convert canvas image to binary data (blob)
            canvas.toBlob((blob) => {
              // Send the blob data via WebSocket
              websocket.current.send(blob);
            }, "image/png");
          }
        };
      mediaRecorderRef.current.start(100); // Capture frame every 100ms
      };
      antdMessage.info('Comenzando la Sesión')
      setIsCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null; 
      videoRef.current.srcObject = null;
      antdMessage.info('Terminando la Sesión')
    }

    if (websocket.current) {
      websocket.current.close();
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card title='Stream'>
      <span style = {{fontSize: '20px'}}>Sesión: {sessionCount}</span>
      <video
        ref={videoRef}
        style={{ width: "100%", height: "auto" }}
        autoPlay
        playsInline
        muted
      />
      <Row justify="center" style={{ marginTop: "auto" }}>
        <Button
          type="primary"
          onClick={() => (isCameraActive ? stopCamera() : startCamera())}
          style={{ margin: "1rem" }}
        >
          {isCameraActive ? "Terminar Sesión" : "Comenzar Sesión"}
        </Button>
      </Row>
    </Card>
  );
};

export default Webcam;

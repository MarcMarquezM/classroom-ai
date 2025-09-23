import React, { useState, useEffect } from "react";
import { Button, Card, Row, message as antdMessage } from 'antd';

const SpeechRecognitionComponent = () => {
  const [listening, setListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();



  recognition.continuous = true;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    setRecognizedText(prevText => prevText + transcript);
  };

  const toggleSpeechRecognition = () => {
    if (!listening) {
      setRecognizedText('');
      recognition.lang = 'es-ES';
      recognition.start();
      antdMessage.info('Comenzando Speech-to-Text');
    } else {
      recognition.stop();
      antdMessage.info('Se ha terminado la sesión');
    }
    setListening(prev => !prev);
  };

  const handleCopyToClipboard = () => {
    if (recognizedText) {
      navigator.clipboard.writeText(recognizedText)
        .then(() => {
          antdMessage.success('Texto copiado!', 1.5);
        })
        .catch((error) => {
          console.error('Failed to copy text to clipboard', error);
          antdMessage.error('Error al copiar texto', 1.5);
        });
    } else {
      antdMessage.warning('No se encuentra texto', 1.5);
    }
  };

  return (
    <Row style={{ overflowX: 'auto', maxWidth: '46rem' }}>
    <Card title="Speech-to-Text">
      <div>
        <p>{recognizedText}</p>
      </div>
      <Row justify="center" style={{ marginTop: "1rem" }}>
        <Button type="primary" onClick={toggleSpeechRecognition} style={{ margin: "1rem" }}>
          {listening ? 'Terminar Sesión' : 'Comenzar Speech to Text'}
        </Button>
        <Button onClick={handleCopyToClipboard} style={{ margin: "1rem" }}>
          Copiar texto
        </Button>
      </Row>
    </Card>
    </Row>
  );
};

export default SpeechRecognitionComponent;

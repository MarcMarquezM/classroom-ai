/* Porpiedad del equipo Caballeros de Camelot.
Descripcion de login.js: componente de React que representa una pagina de inicio de sesion. Permite a los 
usuarios acceder con sus cuentas de Google y muestra informacion sobre el sistema Classroom AI. */

// Importa React y varios componentes y utilidades de bibliotecas externas.
import React, { useEffect, useState } from "react";
import PageLayout from "/src/components/layout";
import {Table, Card, Row, Col, DatePicker, message} from 'antd'
import AulasModal from '../components/AulasModal'
import APIController from "../hooks/APIController";
import Webcam from '../components/webcam';
import SpeechRecognitionComponent from '../components/speechRecognition'
import { useRouter } from "next/router";
import ProtectedRoute from "@/components/ProtectedRoute"; 
import {useUser} from "../hooks/UserContext"
import {useCourse} from "../hooks/CourseContext"
import {useStudent} from "../hooks/StudentContext"

// Desestructura DatePicker y Table de la biblioteca 'antd'.
const { Column } = Table;

// Define el componente 'Home'.
export default function Home() {
  const router = useRouter();
  // Utiliza el hook 'message.useMessage()' para gestionar mensajes y notificaciones.
  const [messageApi, contextHolder] = message.useMessage();
  // Obtiene los datos de los gráficos de 'studentData'.
  const { userData } = useUser();
  const { courseData } = useCourse();
  const { studentDataContext } = useStudent();
  const [studentsForCourse, setStudentsForCourse] = useState([]);

  // Retorna la estructura de la página.
  return (
    <ProtectedRoute>
      <PageLayout>
        {contextHolder}
        <AulasModal 
          email={userData.id}
          roleID={userData.roleID}
          userID={userData.userID}
          setStudentsForCourse={setStudentsForCourse}
          studentsForCourse={studentsForCourse}>
        </AulasModal>
        <Row wrap gutter = {[12, 12]} style = {{justifyContent: 'center', margin: '2rem'}}>
          {(userData.roleID === 3 || userData.roleID === 2) && studentsForCourse && studentsForCourse.length > 0 && (
            <>
            <Col>
              <Webcam 
                course = {courseData} 
                studentData = {studentDataContext} 
              />
            </Col>
            <Col>
              <SpeechRecognitionComponent>

              </SpeechRecognitionComponent>
            </Col>
            </>
          )}
        </Row>
      </PageLayout>
    </ProtectedRoute>
  )
}

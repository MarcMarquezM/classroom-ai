import React, { useEffect, useState } from "react";
import {
    Button, 
    Card, 
    Row, 
    Col, 
    Form, 
    Space, 
    Input, 
    Drawer, 
    FloatButton, 
    Upload, 
    message, 
    Tooltip, 
    Divider,
    Select,
    DatePicker,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, UploadOutlined, DeleteOutlined, AlignLeftOutlined, ReloadOutlined} from '@ant-design/icons';
import APIController from "../hooks/APIController";
import TablePage from "../components/tablePage"
import { useCourse } from '../hooks/CourseContext';
import { useStudent } from '../hooks/StudentContext';
import {studentData} from '../components/charts/chartData/studentData'
import { useDate } from "@/hooks/DateContext";
import Bar from '../components/charts/barChart.js'
import Doughnut from "./charts/doughnutChart";
import Line from '../components/charts/lineChart'

export default function cursosModal({roleID, email, userID, setStudentsForCourse, studentsForCourse}){
    const [openDrawer, setOpenDrawer] = useState(false);
    const [submittedStatus, setSubmittedStatus] = useState([]);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [courses, setCourses] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [dataStudents, setDataStudents] = useState([])
    const { courseData, setCourseData } = useCourse();
    const { studentDataContext, setStudentDataContext } = useStudent();
    const { dateContext, setDateContext } = useDate();
    const [joinedData, setJoinedData] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [totalAssistance, setTotalAssistance] = useState(0);
    const [totalParticipation, setTotalParticipation] = useState(0);
    const [joinedRangeData, setJoinedRangeData] = useState({});
    const [courseNameData, setCourseNameData] = useState("Selecciona un Curso");
    const { dataTotal, dataBar, dataLineAssistance} = studentData(joinedData, totalAssistance, totalParticipation, joinedRangeData);

    // Funcion para cargar datos iniciales
    const fetchData = async () => {
        try {
            // Obtener cursos
            if(email){
                var coursesResponse = await APIController.getCoursesStudent(email);
            }         
            else{
                var coursesResponse = await APIController.getCoursesUser(userID)
            }
            if (coursesResponse.success) {
                const coursesData = coursesResponse.data;
                // Obtener profesores para cada curso
                const coursesWithProfessors = await Promise.all(
                    coursesData.map(async (course) => {
                        const professorsResponse = await APIController.getProfessors(course.CourseID);
                        if (professorsResponse.success) {
                            course.professors = professorsResponse.data;
                            setProfessors(course.professors)
                        } else {
                            console.error("Error fetching professors for course:", course.CourseName);
                        }
                        return course;
                    })
                );
                setCourses(coursesWithProfessors);
            } else {
                console.error("Error fetching courses:", coursesResponse.data);
            }
        } catch (error) {
            console.error("Error fetching data courses and professors:", error);
            messageApi.error("No existen Cursos", 1.5);
        }
    };

    useEffect(() => {
        fetchData();
        getStudentsList();
    }, []);

    // Funcion para eliminar un curso
    const deleteCourse = async (courseID) => {
        try {
            const response = await APIController.deleteCourse(courseID);
            if (response.success) {
                message.success("Curso eliminado exitosamente", 1.5);
                // Update de la lista al borrar curso
                const updatedCourses = courses.filter(course => course.CourseID !== courseID);
                setCourses(updatedCourses);
            } else {
                messageApi.error("Error al eliminar el curso", 1.5);
            }
        } catch (error) {
            console.error("Error deleting course:", error);
            messageApi.error("Error al eliminar el curso", 1.5);
        }
    }; 

    // Funcion para manejar el envio de datos al agregar un curso
    const onFinishAddClass = async (values) => {    
        try {
            // Crear curso
            const courseData = {
                CourseName: values.cursos,
            };
            const courseResponse = await APIController.createCourse(userID, courseData);
    
            if (courseResponse.success) {                
                // Obtener el ID del curso
                const courseId = courseResponse.data.CourseID;
    
                // Crear profesor
                if(roleID === 4){
                    var professorData = {
                        ProfessorName: 'N/A',
                    };  
                } else {
                    var professorData = {
                    ProfessorName: values.profesor,
                };
                }
                const professorResponse = await APIController.createProfessor(professorData, courseId);
    
                if (professorResponse.success) {
                    if(roleID === 4){
                    // Crear estudiantes
                        for (const student of values.clases) {
                            var studentData = {
                                FirstName: 'N/A',
                                LastName: 'N/A',
                                Email: randomEmail(),
                            }
                            const studentResponse = await APIController.createStudentAux(studentData, courseId);
                            if (studentResponse.success) {
                                console.log("Student created:", studentResponse.data);
                            } else {
                                console.error("Error creating student:", studentResponse.data);
                                messageApi.error("Error al agregar datos", 1.5);
                            }
                        }
                    }
                    if(roleID === 3 || roleID === 2){
                        var studentData = {
                            Email: selectedItems,
                        };
                        const studentResponse = await APIController.addStudentCourse(studentData, courseId);
                        if (studentResponse.success) {
                            console.log("Students added");
                        } else {
                            console.error("Error creating students:", studentResponse.data);
                            messageApi.error("Error al agregar datos", 1.5);
                        }
                    }
                    message.success("Datos Actualizados", 1.5);
                } else {
                    console.error("Error creating professor:", professorResponse.data);
                    messageApi.error("Error al agregar datos", 1.5);
                }
            } else {
                console.error("Error creating course:", courseResponse.data);
                messageApi.error("Error al agregar datos", 1.5);
            }
        } catch (error) {
            console.error("Error creating entities:", error);
            messageApi.error("Error al crear entidades", 1.5);
        }
        fetchData();
        getStudentsList();
        form.resetFields();
    };

    const showDrawer = () => {
    setOpenDrawer(true);
    };

    const onClose = () => {
        setOpenDrawer(false);
    };

    // Funcion para normalizar archivos subidos
    function normFile(e) {
    if (Array.isArray(e)) {
        return e;
    }
    return e && e.fileList;
    }

    // Funcion para validar el tipo de archivo antes de subirlo
    function beforeUpload(file) {
    const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isImage) {
        message.error('Solo se pueden subir archivos JPG/PNG');
    }
    return isImage;
    }

    // Funcion para resetear el estado de un elemento del formulario
    const resetFormItem = (index) => {
        setSubmittedStatus((prevStatus) => {
            const updatedStatus = [...prevStatus];
            updatedStatus[index] = false;
            return updatedStatus;
        });
        
        form.setFieldsValue({
            clases: form.getFieldValue('clases').map((item, i) => {
            if (i === index) {
                return {
                ...item,
                facePhoto: [],
                };
            }
            return item;
            }),
        });
    };
        
    // Función para manejar cambios en archivos subidos
    const handleFileChange = (info, index) => {
        if (info.file.status === 'done') {
            message.success(`${info.file.name} importado existosamente`);
            form.setFieldsValue({
            clases: form.getFieldValue('clases').map((item, i) => {
                if (i === index) {
                // Actualizar el estado de submitted para las imágenes
                setSubmittedStatus((prevStatus) => {
                    const updatedStatus = [...prevStatus];
                    updatedStatus[index] = true;
                    return updatedStatus;
                });
                return {
                    ...item,
                    facePhoto: [{ uid: info.file.uid, name: info.file.name }],
                };
                }
                return item;
            }),
            });
        } else if (info.file.status === 'error') {
            message.error(`Error al subir ${info.file.name}`);
        }
        };

    // Funcion para manejar la eliminación de un elemento del formulario
    const handleRemoveFormItem = (index) => {
        // Restablecer el formulario al hacer clic en el boton "-"
        resetFormItem(index);
        // Quitar el elemento del formulario
        form.setFieldsValue({
            clases: form.getFieldValue('clases').filter((_, i) => i !== index),
        });
    };

    // Funcion para obtener estudiantes de un curso
    const fetchStudentsForCourse = async (courseID, courseName) => {
        try {
            const response = await APIController.getStudents(courseID);
            setCourseNameData(courseName)
            if (response.success) {
                setStudentsForCourse(response.data);
                setStudentDataContext(response.data)
                setCourseData(courseID)
            } else {
                console.error("Error fetching students:", response.data);
                messageApi.error("Error al obtener estudiantes", 1.5);
            }
        } catch (error) {
            console.error("Error fetching students:", error);
            messageApi.error("Error al obtener estudiantes", 1.5);
        }
    };

    async function getStudentsList(){
        try {
          const response = await APIController.getStudentsList();
    
          if (response.success) {
              setDataStudents(response.data);
          } else {
              console.error("Error fetching students:", response.data);
              messageApi.error("Error al obtener Estudiantes", 1.5);
          }
      } catch (error) {
          console.error("Error fetching Students:", error);
          messageApi.error("Error al obtener Estudiantes", 1.5);
        }
    };

    // Función para generar un correo electrónico aleatorio
    function randomEmail() {
        const domain = 'tec.mx';
        const lengthMail = 8;
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let randomEmail = '';
    
        for (let i = 0; i < lengthMail; i++) {
        const index = Math.floor(Math.random() * chars.length);
        randomEmail += chars.charAt(index);
        }
    
        return randomEmail + '@' + domain;
    } 

    const getParticipationAssistance = async () => {
        try {
            const response = await APIController.getParticipationAssistance(courseData, dateContext, studentsForCourse);
            const responseData = response.data;
    
            const responseDate = responseData[0] ? responseData[0].Date : null;
    
            const responseDict = {};
            let totalAssistanceCount = 0;
            let totalParticipationCount = 0;
    
            responseData.forEach(({ StudentID, Data }) => {
                const { AssistanceCount, ParticipationCount } = (Data[0] || { AssistanceCount: 0, ParticipationCount: 0 });
                responseDict[StudentID] = { AssistanceCount, ParticipationCount, Date: responseDate };
                totalAssistanceCount += AssistanceCount;
                totalParticipationCount += ParticipationCount;
            });
    
            const joinedData = studentsForCourse.map(student => {
                const { AssistanceCount, ParticipationCount, Date } = responseDict[student.StudentID] || { AssistanceCount: 0, ParticipationCount: 0, Date: null };
                return { ...student, AssistanceCount, ParticipationCount, Date };
            });
    
            setJoinedData(joinedData);
            console.log(joinedData)
            setTotalAssistance(totalAssistanceCount);
            setTotalParticipation(totalParticipationCount);
            messageApi.success("Se han cargado los datos exitosamente", 1.5);
        } catch (error) {
            console.error('Error fetching part and assis:', error);
        }
    };

    useEffect(() => {
        getParticipationAssistance();
    }, [studentsForCourse, courseData, dateContext]);

    const handleDateChange = (date, dateString) => {
        setDateContext(dateString);
    }

    const handleRangeChange = async (dates, dateStrings) => {
        try {
            const response = await APIController.getDateRange(courseData, dateStrings, studentsForCourse);
            const responseData = response.data;
            const countsPerDay = responseData.map(({ Date, AssistanceCount, ParticipationCount }) => ({
                Date,
                AssistanceCount,
                ParticipationCount,
            }));

            const countsByDate = {};
            countsPerDay.forEach(({ Date, AssistanceCount, ParticipationCount }) => {
                countsByDate[Date] = {
                    AssistanceCount,
                    ParticipationCount,
                };
            });
            setJoinedRangeData(countsByDate);
        } catch (error) {
            console.error('Error fetching date range:', error);
        }
    };


    return(
        <div>     
            <Row justify="space-between" wrap gutter={[12, 12]} style={{margin: '2rem' }}>
                <Col>
                    <DatePicker 
                        onChange={handleDateChange} 
                    />
                </Col>
                <Col>
                <span style={{ fontWeight: 'bold', fontSize: 'larger' }}>
                    {`${courseNameData}`}
                </span>
                </Col>
                <Col >
                    <Button
                        onClick={getParticipationAssistance}
                    >
                        Actualizar <ReloadOutlined />
                    </Button>
                </Col>
            </Row>
            <TablePage 
                joinedData={joinedData}
                courseID = {courseData}
                handleUserAction = {getParticipationAssistance}
            ></TablePage>
             <Row wrap gutter = {[12, 12]} style = {{justifyContent: 'center', margin: '2rem'}}>
          <Col>
            <Card title = 'Participación/Asistencias'
              style={{ height: '400px', width: '600px'}}
             >
                  <Bar chartData={dataBar} />  
            </Card>
          </Col>
          <Col>
            <Card
              style={{ height: '400px'}}
              title={'Total'}>
                <Doughnut style = {{justify: "center", margin: '2.5rem'}}chartData={dataTotal} />
            </Card>
          </Col>
          </Row>
          <Row wrap gutter = {[12, 12]} style = {{justifyContent: 'center', margin: '2rem'}}>
          <Col>
            <Card title = 'Fechas'
              style={{ height: '400px', width: '600px'}}
              extra ={
                <DatePicker.RangePicker onChange={handleRangeChange} style = {{marginRight: '3px'}}/>
              }
             >
                  <Line chartData={dataLineAssistance} />  
            </Card>
          </Col>

          </Row>
            {contextHolder}
        {(roleID === 4) && (
             <Drawer height = '600px' title="Registros" placement="bottom" onClose={onClose} open={openDrawer}>
             <Row gutter = {12}>
             <Col span = {24} align = 'middle'>
             <Form
             form={form}
             name="dynamic_form_nest_item"
             onFinish={onFinishAddClass}
             style={{
                 maxWidth: 220,
                 marginRight: '6rem',
             }}
             autoComplete="off"
             >
             <p style={{ fontWeight: 'bold' }}>Agregar Curso</p>
             <Row gutter = {8} justify = 'center'>
                 <Col>
                     <Form.Item name="cursos" 
                         rules={[
                             {
                             required: true,
                             message: 'Ingresa Curso',
                             },
                         ]}>
                         <Input placeholder = 'Curso' style = {{width: 200}}></Input>
                     </Form.Item>
                 </Col>
             </Row>
             <Divider style = {{maxHeight: 10, marginTop: 0}}><p>Alumnos</p></Divider>
             <Form.List name="clases">
                 {(fields, { add, remove }) => (
                 <>
                     {fields.map(({ key, name, ...restField }, index) => (
                     <Space
                         key={key}
                         style={{
                         display: 'flex',
                         marginBottom: 8,
                         }}
                         align="baseline"
                     >
                         <Form.Item
                         {...restField}
                         name={[name, 'student_email']}
                         >
                         </Form.Item>
                         <Form.Item
                         {...restField}
                         name={[name, 'facePhoto']}
                         valuePropName="fileList"
                         getValueFromEvent={(e) => normFile(e, index)}
                     >
                         <Upload
                         name="avatar"
                         showUploadList={false}
                         beforeUpload={beforeUpload}
                         onChange={(info) => handleFileChange(info, index)}
                         >
                         {submittedStatus[index] ? (
                             <span>Agregado</span>
                         ) : (
                             <Button icon={<UploadOutlined />}>Agregar foto del alumno</Button>
                         )}
                         </Upload>
                     </Form.Item>
                         <MinusCircleOutlined onClick={() => handleRemoveFormItem(index)} />
                     </Space>
                     ))}
                    
                     
                     <Form.Item >
                     <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                         Agregar Alumnos
                     </Button>
                     </Form.Item>
                 </>
                 )}
             </Form.List>
             
             <Form.Item >
                 <Button type="primary" htmlType="submit" style = {{width: 220 ,backgroundColor: 'rgb(106, 106, 255)'}}>
                 Submit
                 </Button>
             </Form.Item>
             </Form>
             <Divider style = {{margin: '2rem'}}></Divider>
             </Col>
                 <Row gutter = {[12, 12]} wrap style = {{justifyContent: 'left'}}>
                 {courses.map((course) => (
                     <Col key={course.CourseID}>
                         <Card
                         hoverable
                         style={{ width: 300, marginBottom: '2rem', position: 'relative' }}
                         onClick={() => {fetchStudentsForCourse(course.CourseID, course.CourseName), onClose()}}
                         >
                         <Button
                             style={{
                             position: 'absolute',
                             top: 10,
                             right: 0,
                             backgroundColor: 'red',
                             margin: '10px'
                             }}
                             onClick={(e) => {
                             e.stopPropagation(); // Prevent the click event from propagating to the card
                             deleteCourse(course.CourseID);
                             }}
                         >
                             <DeleteOutlined style={{ color: 'white' }} />
                         </Button>
                         {`Curso: ${course.CourseName}`}
                         </Card>
                     </Col>
                     ))}           
                 </Row>
             </Row>
         </Drawer>
        )}
        {(roleID === 3 || roleID === 2) && (
        <Drawer height = '600px' title="Registros" placement="bottom" onClose={onClose} open={openDrawer}>
            <Row gutter = {12}>
            <Col span = {24} align = 'middle'>
            
            <Form
            form={form}
            name="dynamic_form_nest_item"
            onFinish={onFinishAddClass}
            style={{
                maxWidth: 480,
                marginRight: '6rem',
            }}
            autoComplete="off"
            >
            <p style={{ fontWeight: 'bold' }}>Agregar Curso</p>
            <Row gutter = {8} justify = 'center'>
                <Col>
                    <Form.Item name="cursos" 
                        rules={[
                            {
                            required: true,
                            message: 'Ingresa Curso',
                            },
                        ]}>
                        <Input placeholder = 'Curso' style = {{width: 100}}></Input>
                    </Form.Item>
                </Col>
                <Col>
                    <Form.Item name="profesor" 
                        rules={[
                            {
                            required: true,
                            message: 'Ingresa profesor',
                            },
                        ]}>
                        <Input placeholder = 'Profesor' style = {{maxWidth: 450}}></Input>
                    </Form.Item>
                </Col>
            </Row>
            <Divider style = {{maxHeight: 10, marginTop: 0}}><p>Alumnos</p></Divider>
                <>
                    <Space
                        style={{
                        display: 'flex',
                        marginBottom: 8,
                        }}
                        align="baseline"
                    >
                        <Form.Item
                            name={[name, "student"]}
                            rules={[
                                {
                                required: true,
                                message: "Selecciona por lo menos un estudiante",
                                },
                            ]}
                            >
                            <Select
                                mode = 'multiple'
                                showSearch
                                style = {{width: '30rem'}}
                                placeholder="Estudiantes"
                                value={selectedItems}
                                onChange={setSelectedItems}
                                dropdownStyle={{ textAlign: 'center' }}
                            >
                                {dataStudents.map((student) => (
                                <Select.Option
                                    key={student.Email}
                                    value={student.Email}
                                >
                                    {`${student.FirstName} ${student.LastName} - ${student.Email}`}
                                </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Space>
                </>
                            
            <Form.Item >
                <Button type="primary" htmlType="submit" style = {{width: 290 ,backgroundColor: 'rgb(106, 106, 255)'}}>
                Submit
                </Button>
            </Form.Item>
            </Form>
            <Divider style = {{margin: '2rem'}}></Divider>
            </Col>
                <Row gutter = {[12, 12]} wrap style = {{justifyContent: 'left'}}>
                {courses.map((course) => (
                    <Col key={course.CourseID}>
                        <Card
                        title={`Curso: ${course.CourseName}`}
                        hoverable
                        style={{ width: 300, marginBottom: '2rem', position: 'relative' }}
                        onClick={() => {fetchStudentsForCourse(course.CourseID, course.CourseName), onClose()}}
                        >
                        <Button
                            style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            backgroundColor: 'red',
                            margin: '10px'
                            }}
                            onClick={(e) => {
                            e.stopPropagation();
                            deleteCourse(course.CourseID);
                            }}
                        >
                            <DeleteOutlined style={{ color: 'white' }} />
                        </Button>
                        <div>
                            <span style={{ fontWeight: 'bold' }}>Profesor: </span>
                            {course.professors.map((professor) => (
                            <span key={professor.ProfessorID}>
                                {professor.ProfessorName}
                            </span>
                            ))}
                        </div>
                        </Card>
                    </Col>
                    ))}           
                </Row>
            </Row>
        </Drawer>
        )}
        {(roleID === 3 || roleID === 2 || roleID === 4) && (
            <Tooltip title="Agregar">
                <FloatButton type="primary" onClick={showDrawer} icon={<PlusOutlined/>} />
            </Tooltip>
        )}
        {roleID === 1 && (
            <Tooltip title="Cursos">
                <FloatButton type="primary" onClick={showDrawer} icon={<AlignLeftOutlined />} />
            </Tooltip>
        )}
        {roleID === 1 && (
        <Drawer height = '600px' title="Registros" placement="bottom" onClose={onClose} open={openDrawer}>
            <Row gutter = {12}>
            
                <Row gutter = {[12, 12]} wrap style = {{justifyContent: 'left'}}>
                {courses.map((course) => (
                    <Col key={course.CourseID}>
                        <Card
                        title={`Curso: ${course.CourseName}`}
                        hoverable
                        style={{ width: 300, marginBottom: '2rem', position: 'relative' }}
                        onClick={() => {fetchStudentsForCourse(course.CourseID, course.CourseName), onClose()}}
                        >
                        <div>
                            <span style={{ fontWeight: 'bold' }}>Profesor: </span>
                            {course.professors.map((professor) => (
                            <span key={professor.ProfessorID}>
                                {professor.ProfessorName}
                            </span>
                            ))}
                        </div>
                        </Card>
                    </Col>
                    ))}           
                </Row>
            </Row>
        </Drawer>
        )}
        </div>
    )
}

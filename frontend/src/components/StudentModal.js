import React, { useState, useEffect } from "react";
import {
	Modal,
	Form,
	Typography,
	Input,
	Button,
	Row,
	Upload,
	Col,
} from "antd";
import { SaveOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import APIController from "@/hooks/APIController";
import imageCompression from 'browser-image-compression';
import { studentData } from "./charts/chartData/studentData";
import { useDate } from "@/hooks/DateContext";

const { Text } = Typography;

export const AddModal = ({isOpen, showModal, handleUserAction, messageApi }) => {
    const [form] = Form.useForm();
    const [imageBlob, setImageBlob] = useState(null);
    

    const beforeUpload = (file) => {
        const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isImage) {
        messageApi.error('Solo se pueden subir archivos JPG/PNG');
        }
        return isImage;
    };
                
    // Función para manejar cambios en archivos subidos
    const handleFileChange = async (info) => {
        if (info.file.status === 'done') {
            messageApi.success(`${info.file.name} importado existosamente`);
            const compressedImage = await compressImage(info.file.originFileObj);
            convertToBlob(compressedImage);
        } else if (info.file.status === 'error') {
            messageApi.error(`Error al subir ${info.file.name}`);
        }
    };
    
    const compressImage = async (file) => {
        const options = {
            maxSizeMB: 0.5, 
            maxWidthOrHeight: 800,
        };
    
        try {
            const compressedFile = await imageCompression(file, options);
            return compressedFile;
        } catch (error) {
            console.error('Image compression error:', error);
            return file;
        }
    };

    const convertToBlob = (file) => {
        const reader = new FileReader();
        reader.onload = function () {
            const arrayBuffer = this.result; 
            const uint8Array = new Uint8Array(arrayBuffer);
    
            const blob = new Blob([uint8Array], { type: file.type });
    
            setImageBlob(blob);
        };
        reader.readAsArrayBuffer(file);
    };

    async function addStudents(){
		try {
			const data = form.getFieldsValue();
            console.log(data)
			const addStudent = await APIController.createStudent(data);
            if (addStudent && imageBlob) {
                const uploadImage = await APIController.uploadStudentImage(data.Email, imageBlob);
                console.log("Image uploaded:", uploadImage);
            } else {
                console.log('Error al agrgar imagen')
                messageApi.error("Error al agregar imagen", 1.5)
            }
			console.log(addStudent);
			closeModal();
            handleUserAction();
            messageApi.success("Agregando Estudiante", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al agregar Estudiante", 1.5);
		}
	}

    function closeModal() {
		form.resetFields();
		showModal(false);
        setImageBlob(null);
	}

    return(
        <Modal
            title="Agregar Estudiante"
            style={{ textAlign: "center" }}
            width={800}
            open={isOpen}
            onCancel={closeModal}
            afterClose={() => {
                form.resetFields();
            }}
            footer={[
                <Row
                    style={{ width: "100%", justifyContent: "space-evenly" }}
                    key="footer-row">
                        <Button
                            key="submit"
                            type="default"
                            form="addForm"
                            htmlType="submit"
                            onClick={addStudents}
                            style={{ backgroundColor: "#499F9F" }}>
                            <Text style={{ color: "white" }}>Agregar</Text>
                            <SaveOutlined style={{ color: "white" }}></SaveOutlined>
                        </Button>
                </Row>,
            ]}
            >
                <Form
                    id="addStudents"
                    form={form}
                    layout="vertical"
                >
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="Email"
                                label="Correo"
                                key="Email"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor ingrese un Correo",
                                    },
                                ]}>
                                <Input
                                    placeholder="Correo"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="FirstName"
                                label="Nombre"
                                key="FirstName"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor ingrese el Nombre",
                                    },
                                ]}>
                                <Input
                                    placeholder="Nombre"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="LastName"
                                label="Apellido"
                                key="LastName"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor ingrese el Apellido",
                                    },
                                ]}>
                                <Input
                                    placeholder="Apellido"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="Img"
                                key="Img"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor subir la imagen",
                                    },
                                ]}>
                                <Upload
                                    name="avatar"
                                    showUploadList={false}
                                    beforeUpload={beforeUpload}
                                    onChange={handleFileChange}
                                    >
                                    {imageBlob ? (
                                        <span>Agregado</span>
                                    ) : (
                                        <Button icon={<UploadOutlined />}>Agregar foto del alumno</Button>
                                    )}
                                </Upload>
                                
                            </Form.Item>
                            
                        </Col>
                        <Col span = {24}>
                            <span style = {{fontSize: '10px', color: 'red', margin: '3px'}}>Asegurar de que sea una foto individual de la cara del alumno</span>
                        </Col>
                    </Row>
                </Form>
        </Modal>                   
    )
}

export const EditModal = ({isOpen, showModal, handleUserAction, messageApi, student}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (student) {
            form.setFieldsValue({
                Email: student.Email,
                FirstName: student.FirstName,
                LastName: student.LastName,
            });
        }
    }, [student, form]);

    async function editStudents(){
		try {
			const data = form.getFieldsValue();
			const editUser = await APIController.updateStudent(student.StudentID, data);
			console.log(editUser);
			closeModal();
            handleUserAction();
            messageApi.success("Editando Estudiante", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al editar Estudiante", 1.5);
		}
	}

    function closeModal() {
		form.resetFields();
		showModal(false);
	}

    return(
        <Modal
            title="Editar Usuario"
            style={{ textAlign: "center" }}
            width={800}
            open={isOpen}
            onCancel={closeModal}
            afterClose={() => {
                form.resetFields();
            }}
            footer={[
                <Row
                    style={{ width: "100%", justifyContent: "space-evenly" }}
                    key="footer-row">
                        <Button
                            key="submit"
                            type="default"
                            form="addForm"
                            htmlType="submit"
                            onClick={editStudents}
                            style={{ backgroundColor: "#499F9F" }}>
                            <Text style={{ color: "white" }}>Editar</Text>
                            <SaveOutlined style={{ color: "white" }}></SaveOutlined>
                        </Button>
                </Row>,
            ]}
            >
            
                <Form
                    id="editStudents"
                    form={form}
                    layout="vertical"
                >
                    <Row gutter={[16, 16]}>                          
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="Email"
                                label="Correo"
                                key="Email">
                                <Input
                                    disabled placeholder="Email"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="FirstName"
                                label="Nombre"
                                key="FirstName">
                                <Input
                                    placeholder="Nombre"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="LastName"
                                label="Apellido"
                                key="LastName">
                                <Input
                                    placeholder="Apellido"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
        </Modal>                   
    )
}

export const DeleteModal = ({ 
	isOpen,
	showModal,
	student,
    handleUserAction,
    messageApi,
}) => {

	function closeModal() {
		showModal(false);
	}

	async function deleteStudent(){
		try {
			const deleted = await APIController.deleteStudent(student.StudentID);
			console.log(deleted);
            deleteStudentImage();
			closeModal();
            handleUserAction();
            messageApi.success("Eliminando Estudiante", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al eliminar Estudiante", 1.5);
		}
	}

    async function deleteStudentImage(){
		try {
			const deletedImage = await APIController.deleteStudentImage(student?.Email);
			console.log(deletedImage);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al eliminar foto del Estudiante", 1.5);
		}
	}

	return (
		<Modal
			title="¿Deseas eliminar este registro?"
			open={isOpen}
			onCancel={closeModal}
			footer={[
				<Row
					style={{ width: "100%", justifyContent: "space-evenly" }}
					key="footer-row">
					<Button
						key="cancel"
						onClick={closeModal}
						type="default">
						<Text>Cancelar</Text>
					</Button>
					<Button
						key="submit"
						type="default"
						form="deleteForm"
						htmlType="submit"
						style={{ backgroundColor: "#EA3F3F" }}
						onClick={deleteStudent}
                        >
						<Text style={{ color: "white" }}>Eliminar</Text>
						<DeleteOutlined style={{ color: "white" }}></DeleteOutlined>
					</Button>
				</Row>,
			]}>
			<Text>{student?.Email}</Text>
		</Modal>
	);
};

export const EditForCourseModal = ({ 
	isOpen,
	showModal,
	student,
    messageApi,
    courseID,
    handleUserAction
}) => {
    const { dateContext } = useDate();
    const [form] = Form.useForm();
    useEffect(() => {
        if (student) {
            form.setFieldsValue({
                AssistanceCount: student.AssistanceCount,
                ParticipationCount: student.ParticipationCount,
            });
        }
    }, [student, form]);

	function closeModal() {
		showModal(false);
	}

	async function updateStudent(){
		try {
            const data = form.getFieldsValue();
            data.AssistanceCount = parseInt(data.AssistanceCount, 10);
            data.ParticipationCount = parseInt(data.ParticipationCount, 10);
			const update = await APIController.updateStudentCount(courseID, student.StudentID, dateContext, data);
            console.log(update)
			closeModal();
            handleUserAction();
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("El estudiante necesita asistir para modificar este registro", 3);
		}
	}

	return (
		<Modal
			title="Editar Estudiante"
			open={isOpen}
			onCancel={closeModal}
            afterClose={() => {
                form.resetFields();
            }}
			footer={[
                <Row
                    style={{ width: "100%", justifyContent: "space-evenly" }}
                    key="footer-row">
                        <Button
                            key="submit"
                            type="default"
                            form="addForm"
                            htmlType="submit"
                            onClick={updateStudent}
                            style={{ backgroundColor: "#499F9F" }}>
                            <Text style={{ color: "white" }}>Editar</Text>
                            <SaveOutlined style={{ color: "white" }}></SaveOutlined>
                        </Button>
                </Row>,
            ]}>
                <Form
                id="editStudentsForCourse"
                form={form}
                layout="vertical"
                >
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <Form.Item
                                style={{ margin: "10px" }}
                                name="FirstLastName"
                                label="Nombre"
                                key="FirstLastName">
                            <Text strong>{student?.FirstName} {student?.LastName}</Text>

                        </Form.Item>
                    </Col>                        
                    <Col span={8}>
                        <Form.Item
                            style={{ margin: "10px" }}
                            name="AssistanceCount"
                            label="Asistencia"
                            key="AssistanceCount">
                            <Input
                                placeholder="Asistencia"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item
                            style={{ margin: "10px" }}
                            name="ParticipationCount"
                            label="Participación"
                            key="ParticipationCount">
                            <Input
                                placeholder="Participación"
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
		</Modal>
	);
};
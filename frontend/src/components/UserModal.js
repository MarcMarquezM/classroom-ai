import React, { useState, useEffect } from "react";
import {
	Modal,
	Form,
	Select,
	Typography,
	Input,
	Button,
	Row,
	Card,
	Col,
} from "antd";
import { SaveOutlined, DeleteOutlined } from "@ant-design/icons";
import APIController from "@/hooks/APIController";

const { Text } = Typography;

export const AddModal = ({isOpen, showModal, handleUserAction, messageApi }) => {
    const [form] = Form.useForm();

    async function addUsers(){
		try {
			const data = form.getFieldsValue();
			const addUser = await APIController.addUsers(data);
			console.log(addUser);
			closeModal();
            handleUserAction();
            messageApi.success("Agregando Usuario", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al agregar Usuario", 1.5);
		}
	}

    function closeModal() {
		form.resetFields();
		showModal(false);
	}

    return(
        <Modal
            title="Agregar Usuario"
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
                            onClick={addUsers}
                            style={{ backgroundColor: "#499F9F" }}>
                            <Text style={{ color: "white" }}>Agregar</Text>
                            <SaveOutlined style={{ color: "white" }}></SaveOutlined>
                        </Button>
                </Row>,
            ]}
            >
            
                <Form
                    id="addUsers"
                    form={form}
                    layout="vertical"
                >
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="RoleID"
                                label="Rol"
                                key="RoleID"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor selecciona un rol",
                                    },
                                ]}>
                                <Select
                                    placeholder="Rol"
                                    dropdownStyle={{ textAlign: "center" }}
                                    options={[
                                        {
                                            value: 3,
                                            label: (
                                                <span>
                                                    Administrador
                                                </span>
                                            ),
                                        },
                                        {
                                            value: 2,
                                            label: (
                                                <span>
                                                    Profesor
                                                </span>
                                            ),
                                        },
                                        {
                                            value: 4,
                                            label: (
                                                <span>
                                                    Auxiliar
                                                </span>
                                            ),
                                        },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="Email"
                                label="Email"
                                key="Email"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor ingrese un Correo",
                                    },
                                ]}>
                                <Input
                                    placeholder="Email"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="PasswordHash"
                                label="Password"
                                key="PasswordHash"
                                rules={[
                                    {
                                        required: true,
                                        message: "Por favor ingrese un valor",
                                    },
                                ]}>
                                <Input
                                    placeholder="Password"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
        </Modal>                   
    )
}

export const EditModal = ({isOpen, showModal, handleUserAction, messageApi, user}) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (user) {
            form.setFieldsValue({
                RoleID: user.RoleID,
                Email: user.Email,
                PasswordHash: user.PasswordHash.slice(-10),
            });
        }
    }, [user, form]);

    async function editUsers(){
		try {
			const data = form.getFieldsValue();
			const editUser = await APIController.updateUsers(user.UserID, data);
			console.log(editUser);
			closeModal();
            handleUserAction();
            messageApi.success("Editando Usuario", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al editar Usuario", 1.5);
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
                            onClick={editUsers}
                            style={{ backgroundColor: "#499F9F" }}>
                            <Text style={{ color: "white" }}>Editar</Text>
                            <SaveOutlined style={{ color: "white" }}></SaveOutlined>
                        </Button>
                </Row>,
            ]}
            >
            
                <Form
                    id="editUsers"
                    form={form}
                    layout="vertical"
                >
                    <Row gutter={[16, 16]}>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="RoleID"
                                label="Rol"
                                key="RoleID">
                                <Select
                                    placeholder="Rol"
                                    dropdownStyle={{ textAlign: "center" }}
                                    options={[
                                        {
                                            value: 3,
                                            label: (
                                                <span>
                                                    Administrador
                                                </span>
                                            ),
                                        },
                                        {
                                            value: 2,
                                            label: (
                                                <span>
                                                    Profesor
                                                </span>
                                            ),
                                        },
                                        {
                                            value: 4,
                                            label: (
                                                <span>
                                                    Auxiliar
                                                </span>
                                            ),
                                        },
                                    ]}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="Email"
                                label="Email"
                                key="Email">
                                <Input
                                    placeholder="Email"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                style={{ margin: "10px" }}
                                name="PasswordHash"
                                label="Password"
                                key="PasswordHash">
                                <Input.Password
                                    placeholder="Password"
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
	user,
    handleUserAction,
    messageApi,
}) => {

	function closeModal() {
		showModal(false);
	}

	async function deleteUsers(){
		try {
			const deleted = await APIController.deleteUsers(user.UserID);

			console.log(deleted);
			closeModal();
            handleUserAction();
            messageApi.success("Eliminando Usuario", 1.5);
		} catch (e) {
			console.error("Error: ", e.message);
            messageApi.error("Error al eliminar Usuario", 1.5);
            messageApi.error("Revisa si el usuario ha creado un curso", 3);
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
						onClick={deleteUsers}
                        >
						<Text style={{ color: "white" }}>Eliminar</Text>
						<DeleteOutlined style={{ color: "white" }}></DeleteOutlined>
					</Button>
				</Row>,
			]}>
			<Text>{user?.Email}</Text>
		</Modal>
	);
};
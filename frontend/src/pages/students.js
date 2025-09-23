// Importa React y varios componentes y utilidades de bibliotecas externas.
import React, { useEffect, useState } from "react";
import PageLayout from "/src/components/layout";
import {Table, Space, Row, Col, Button, message, Typography} from 'antd'
import {
	PlusOutlined,
	EyeOutlined,
	DeleteOutlined,
	SaveOutlined,
} from "@ant-design/icons";
import APIController from "../hooks/APIController";
import {AddModal, DeleteModal, EditModal} from "../components/StudentModal"
import ProtectedRoute from "@/components/ProtectedRoute"; 


// Desestructura Typography y Table de la biblioteca 'antd'.
const { Column } = Table;
const { Text } = Typography;

// Define el componente 'Home'.
export default function Users() {
  const [messageApi, contextHolder] = message.useMessage();
  const [dataStudents, setDataStudents] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAdd, setModalAdd] = useState(false)
  const [modalEdit, setModalEdit] = useState(false);
  const [modalDelete, setModalDelete] = useState(false);

  const showAddModal = () => {
		setSelectedUser(null);
		setModalAdd(true);
	};

	const showEditModal = (student) => {
		setSelectedUser(student);
		setModalEdit(true);
	};

  const showDeleteModal = (student) => {
		setSelectedUser(student);
		setModalDelete(true);
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
  }

  useEffect(() => {
    getStudentsList();
  }, []);

  const handleUserAction = () => {
    getStudentsList();
  };
  
  // Retorna la estructura de la página.
  return (
    <ProtectedRoute>
      <PageLayout>
        <AddModal 
            isOpen={modalAdd}
            showModal={setModalAdd}
            messageApi={messageApi}
            handleUserAction={handleUserAction}
        ></AddModal>
        <EditModal 
            isOpen={modalEdit}
            showModal={setModalEdit}
            student={selectedUser}
            messageApi={messageApi}
            handleUserAction={handleUserAction}
        ></EditModal>
        <DeleteModal
            isOpen={modalDelete}
            showModal={setModalDelete}
            student={selectedUser}
            messageApi={messageApi}
            handleUserAction={handleUserAction}
        ></DeleteModal>
        {contextHolder}
        <Space
                style={{ marginLeft: "2rem" }}
                align="center"
                size="middle"
                direction="horizontal">
                <Button
                  type="default"
                  style={{ width: "150px" }}
                  onClick={() => showAddModal()}>
                  <Text style={{ color: "#499F9F" }}> Agregar Registro </Text>
                  <PlusOutlined style={{ color: "#499F9F" }}></PlusOutlined>
                </Button>
              </Space>
        <Row style = {{margin: '2rem'}}>
          <Col>
          <Table
            pagination={true}
            expandable={true}
            rowKey="StudentID"
            dataSource={dataStudents.map((el, i) => ({ key: i, ...el }))}
            scroll={{
                x: 1000,
                y: 800,
            }}>
            <Column
                title="ID"
                dataIndex="StudentID"
                key="StudentID"
                fixed="left"
                width={200}
                align="center"
            ></Column>
            <Column
                title="Correo"
                dataIndex="Email"
                key="Email"
                fixed="left"
                width={200}
                align="center"
            ></Column>
             <Column
                title="Nombre"
                dataIndex="FirstName"
                key="FirstName"
                fixed="left"
                width={200}
                align="center"
            ></Column>
             <Column
                title="Apellido"
                dataIndex="LastName"
                key="LastName"
                fixed="left"
                width={200}
                align="center"
            ></Column>
            
                <Column
                    title=""
                    dataIndex="Editar"
                    key="Editar"
                    fixed="right"
                    width={65}
                    align="center"
                    render={(_, record) => {
                      return (
                        <>
                          <Button onClick={() => showEditModal(record)}>
                            <EyeOutlined />
                          </Button>
                        </>
                      );
                    }}></Column>
                  <Column
                    title=""
                    dataIndex="Borrar"
                    key="Borrar"
                    fixed="right"
                    width={65}
                    align="center"
                    render={(_, record) => {
                      return (
                        <Button
                          onClick={() => showDeleteModal(record)}
                          style={{ backgroundColor: "#EA3F3F" }}>
                          <DeleteOutlined
                            style={{ color: "white" }}></DeleteOutlined>
                        </Button>
                      );
                    }}></Column>
            </Table> 
          </Col>
        </Row>
        <Row style = {{margin: '2rem'}}>
        </Row>
      </PageLayout>
    </ProtectedRoute>
  )
}

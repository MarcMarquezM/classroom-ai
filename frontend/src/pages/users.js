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
import {AddModal, DeleteModal, EditModal} from "../components/UserModal"
import ProtectedRoute from "@/components/ProtectedRoute"; 


// Desestructura Typography y Table de la biblioteca 'antd'.
const { Column } = Table;
const { Text } = Typography;

// Define el componente 'Home'.
export default function Users() {
  const [messageApi, contextHolder] = message.useMessage();
  const [dataUsers, setDataUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalAdd, setModalAdd] = useState(false)
  const [modalEdit, setModalEdit] = useState(false);
	const [modalDelete, setModalDelete] = useState(false);

  const showAddModal = () => {
		setSelectedUser(null);
		setModalAdd(true);
	};

	const showEditModal = (user) => {
		setSelectedUser(user);
		setModalEdit(true);
	};

  const showDeleteModal = (user) => {
		setSelectedUser(user);
		setModalDelete(true);
	};


  async function getUsers(){
    try {
      const response = await APIController.getUsers();

      if (response.success) {
          console.log("Users:", response.data);
          setDataUsers(response.data);
      } else {
          console.error("Error fetching users:", response.data);
          messageApi.error("Error al obtener usuarios", 1.5);
      }
  } catch (error) {
      console.error("Error fetching users:", error);
      messageApi.error("Error al obtener Usuarios", 1.5);
    }
  }

  useEffect(() => {
    getUsers();
  }, []);

  const handleUserAction = () => {
    getUsers();
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
            user={selectedUser}
            messageApi={messageApi}
            handleUserAction={handleUserAction}
        ></EditModal>
        <DeleteModal
            isOpen={modalDelete}
            showModal={setModalDelete}
            user={selectedUser}
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
            rowKey="UserID"
            dataSource={dataUsers.map((el, i) => ({ key: i, ...el }))}
            scroll={{
                x: 1000,
                y: 800,
            }}>
            <Column
                title="ID"
                dataIndex="UserID"
                key="UserID"
                fixed="left"
                width={200}
                align="center"
            ></Column>
            <Column
                title="Rol"
                dataIndex="RoleID"
                key="RoleID"
                fixed="left"
                width={200}
                align="center"
            ></Column>
            <Column
                title="Email"
                dataIndex="Email"
                key="Email"
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

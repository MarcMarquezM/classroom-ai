import React, { useEffect, useState } from "react";
import { EditOutlined } from '@ant-design/icons';
import {Table, Row, Col, Button, message} from 'antd'
const { Column } = Table;
import { EditForCourseModal } from './StudentModal';
import {useUser} from "../hooks/UserContext"
import APIController from "@/hooks/APIController";



export default function tablePage({joinedData, courseID, handleUserAction}){
    const [modalEdit, setModalEdit] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messageApi, contextHolder] = message.useMessage();
    const { userData } = useUser();

    const showEditModal = (student) => {
		setSelectedUser(student);
		setModalEdit(true);
	};


    return (
        <>
        <EditForCourseModal 
            isOpen={modalEdit}
            showModal={setModalEdit}
            student={selectedUser}
            messageApi={messageApi}
            courseID = {courseID}
            handleUserAction = {handleUserAction}
        ></EditForCourseModal>
        {contextHolder}
        <Row wrap gutter = {[12, 12]} style = {{justifyContent: 'left', margin: '2rem'}}>
            <Col>
                <Table
                    pagination={true}
                    expandable={true}
                    rowKey="StudentID"
                    dataSource={joinedData.map((el, i) => ({ key: i, ...el }))}
                    scroll={{
                        x: 800,
                        y: 800,
                    }}>
                    <Column
                        title="ID"
                        dataIndex="StudentID"
                        key="StudentID"
                        fixed="left"
                        width={50}
                        align="center"
                    ></Column>
                    {userData.roleID === 1 || userData.roleID === 2 || userData.roleID === 3 ? (
                    <>
                        <Column
                            title="Nombre"
                            dataIndex="FirstName"
                            key="FirstName"
                            fixed="left"
                            width={50}
                            align="center"
                            ></Column>
                        <Column
                            title="Apellido"
                            dataIndex="LastName"
                            key="LastName"
                            width={50}
                            align="center"
                            ></Column>
                        <Column
                            title="Correo"
                            dataIndex="Email"
                            key="Email"
                            width={50}
                            align="center"
                        ></Column>
                    </>
                ) : null}
                    <Column
                        title="Asistencia"
                        dataIndex="AssistanceCount"
                        key="AssitanceCount"
                        width={50}
                        align="center"
                    ></Column>
                    <Column
                        title="Participación"
                        dataIndex="ParticipationCount"
                        key="ParticipationCount"
                        width={50}
                        align="center"
                    ></Column>
                    <Column
                            title="Fecha"
                            dataIndex="Date"
                            key="Date"
                            width={50}
                            align="center"
                    ></Column>
                    {userData.roleID === 2 || userData.roleID === 3 || userData.roleID === 4 ? (
                        <Column
                            title=""
                            dataIndex="Editar"
                            key="Editar"
                            fixed="right"
                            width={40}
                            align="center"
                            render={(_, record) => {
                                return (
                                    <Button onClick={() => showEditModal(record)}>
                                        <EditOutlined />
                                    </Button>
                                );
                            }}
                        ></Column>
                    ) : null}
                </Table> 
            </Col>
          </Row>
          </>
    )
}
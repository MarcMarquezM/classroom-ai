import React, {useState, useEffect} from "react"
import { Breadcrumb, Layout, Menu, Typography, Spin, Row, Col, Tooltip} from 'antd';
import Router, { useRouter } from "next/router";
import styles from '../styles/layout.module.css';
import {
    LoadingOutlined,
    LogoutOutlined,
} from "@ant-design/icons";
const { Header, Content, Footer } = Layout;
const {Text} = Typography;
import { useUser } from "../hooks/UserContext"

export default function PageLayout ({children}) {
    const router = useRouter();
    const currentPathname = router.pathname;
    const currentDefault = currentPathname === "/page" ? "Dashboard" : "Usuarios";
	const [current, setCurrent] = useState(currentDefault);
    const [loading, setLoading] = useState(false);
    const { userData } = useUser();

    const handleRouteChangeStart = () => {
        setLoading(true);
    };

    const handleRouteChangeComplete = (url) => {
        setLoading(false);

        if (url === "/page") {
            setCurrent("Dashboard");
        } else if (url === "/users") {
            setCurrent("Usuarios");
        } else if (url === "/students"){
            setCurrent("Estudiantes")
        }
    };

    const removeLocalStorage = () => {
        window.localStorage.removeItem("token")
        window.localStorage.removeItem("Auth")
        router.push("/login")
    }

    useEffect(() => {
    Router.events.on('routeChangeStart', handleRouteChangeStart);
    Router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
        Router.events.off('routeChangeStart', handleRouteChangeStart)
        Router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
    }, [])
	
    const renderMenuItems = () => {
        if (userData.roleID === 3) {
          return (
            <Menu.Item
              key="Usuarios"
              style={{ margin: "0 20px" }}
              onClick={onClickMenu}
            >
              Usuarios
            </Menu.Item>
          ); 
        }
          else if(userData.roleID === 2) {
            return (
                <Menu.Item
                  key="Estudiantes"
                  style={{ margin: "0 20px" }}
                  onClick={onClickMenu}
                >
                  Estudiantes
                </Menu.Item>
              );
          }
    
        return null;
      };

    const onClickMenu = (e) => {
        setCurrent(e.key);
        if (e.key === "Dashboard") 
        router.push({
            pathname: '/page',
        });
        else if (e.key === "Usuarios" && userData.roleID === 3) 
            router.push({
                pathname: '/users',
            });
        else if (e.key === "Estudiantes" && userData.roleID === 2){
            router.push({
                pathname: '/students'
            })
        }
    };
    
    return (
    <Layout>
        <Header
            style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            width: '100%',
            alignItems: 'center',
            backgroundColor: 'white',
            }}
        >              
        <div/> 
        <Text className = {styles.title}> Classroom AI </Text>
            <Menu
            mode="horizontal"
            style={{ display: "flex", float: 'right'}}
            selectedKeys={[current]}>
            <Menu.Item
            key="Dashboard"
            style={{ margin: "0 20px" }}
            onClick={onClickMenu}
          >
            Dashboard
          </Menu.Item>
          {renderMenuItems()}
            <Menu.Item key= 'local' style={{ margin: "0 20px" }}>
                <Tooltip title="Cerrar Sesión">
                    <LogoutOutlined onClick={removeLocalStorage} />
                </Tooltip>
            </Menu.Item>
        </Menu>
        </Header>
        <Content
            className = {styles.content}
                
        >
            <Breadcrumb
            style={{
                margin: '16px 50px',
            }}
            >
            <Breadcrumb.Item><strong>{current}</strong></Breadcrumb.Item>
            </Breadcrumb>
            <div className={styles.content}>
            <Spin
                spinning={loading}
                indicator={
                <Row justify="center" align="middle">
                    <Col
                    span={24}
                    style={{ textAlign: "center", justifyContent: "center" }}
                    >
                    <LoadingOutlined
                        style={{
                        fontSize: "100px",
                        fontWeight: "bolder",
                        color: "blue",
                        }}
                    ></LoadingOutlined>
                    </Col>
                </Row>
                }
            >
                {children}
            </Spin>
            </div>
        </Content>
        <Footer
            className = {styles.footer}
        >
            <Text italic>Equipo 7 <strong>©2023</strong></Text>
        </Footer>
        </Layout>
    )
}
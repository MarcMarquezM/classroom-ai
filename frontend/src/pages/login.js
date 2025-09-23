/* Porpiedad del equipo Caballeros de Camelot.
Descripcion de login.js: componente de React que representa una pagina de inicio de sesion. Permite a los 
usuarios acceder con sus cuentas de Google y muestra informacion sobre el sistema Classroom AI. */

// Importar modulos
import React, { useEffect, useState } from "react";
import {
Button,
Form,
Row,
Col,
notification,
Divider,
Input,
Checkbox,
Alert,
} from "antd";
import {auth, db} from "@/hooks/firebaseConfig"; 
import { useRouter } from "next/router";
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth"; 
import { Inter } from "@next/font/google";
import Image from "next/image";
import { GoogleOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";
import bdd_img from "../styles/img/classroom_ai_logo.png";
import styles from "../styles/login.module.css";
import icon_img from "../styles/img/eye-icon.gif"
import logo_img from "../styles/img/Imagotipo_A.original.png"
import APIController from "@/hooks/APIController";
import { useUser } from '../hooks/UserContext';


// Configuracion de fuente de Google
const inter = Inter({
subsets: ["latin"],
weight: ["400", "700"],
});

export default function Login() {
    const router = useRouter();
    const [api, contextHolder] = notification.useNotification();
    const [form] = Form.useForm();
    const [rememberMe, setRememberMe] = useState(false);
    const { userData, setUserData } = useUser();
    useEffect(() => {
        const storedRememberMe = localStorage.getItem('rememberMe');
        if (storedRememberMe === 'true') {
            setRememberMe(true);
            form.setFieldsValue({
                email: localStorage.getItem('email'),
                password: localStorage.getItem('password'),
            });
        }
    }, []);

    // Funcion para mostrar notificaciones
    const openNotificationWithIcon = (api, type, title, desc) => {
    api[type]({
        message: title,
        description: desc,
    });
    };

    const handleRememberMeChange = (e) => {
        const checked = e.target.checked;
        setRememberMe(checked);
        localStorage.setItem('rememberMe', checked ? 'true' : 'false');

        if (!checked) {
            localStorage.removeItem('email');
            localStorage.removeItem('password');
        }
    };


    const onFinishLogin = async () => {
        const formData = form.getFieldsValue();
        const { email, password } = formData;
        const token = 'Auth';
        try {
            const response = await APIController.loginProfessors(email, password);
            console.log(response)
            if (response.success) {
                window.localStorage.setItem("token", token)
                if (rememberMe) {
                    localStorage.setItem('email', email);
                    localStorage.setItem('password', password);
                }
                setUserData({
                    roleID: response.data.RoleID,
                    userID: response.data.UserID,
                  });
                router.push({
                    pathname: '/page',
                  });
            } else {
                openNotificationWithIcon(
                    api,
                    "error",
                    "Error",
                    "Credenciales incorrectas. Favor de volver intentar."
                );
            }
        } catch (error) {
            console.log(error);
            openNotificationWithIcon(
                api,
                "error",
                "Error",
                "Error al validar Usuario. Favor de volver intentar."
            );
        }
    };

    // Funcion para iniciar sesion con Google
    const onFinishLoginGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const token = 'Auth';
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const response = await APIController.loginStudents(user.email);
        if (user.email.endsWith("@tec.mx") && response.success || user.email.endsWith("@itesm.mx") && response.success) {
            window.localStorage.setItem("token", token)
            setUserData({
                roleID: response.data.RoleID,
                id: response.data.Email,
              });
            router.push({
            pathname: '/page',
          });
        } else {
        openNotificationWithIcon(api, "error", "Error", "Dominio no es permitido.");
        }
    } catch (error) {
        console.error("Error signing in with Google:", error);
        openNotificationWithIcon(api, "error", "Error", "Error al ingresar con google.");
    }
    };

   

    // Renderizacion del componente
    return (
    <div className={styles.body}>
        {contextHolder}
        {/* <Alert
            message="Plataforma esta en mantenimiento. Implementing features.- Elegir fechas en un curso."
            type="info"
        /> */}

        <Row style={{ height: "100vh" }}>
        <Col span={8} className={styles.col}>
            <div>
            <Image
                src={logo_img}
                className={styles.img_LeftSide}
                alt="logo_template_Image"
            />
            <h1>Hey, bienvenid@!👋</h1>
            </div>
            <div>
            <Form
                name="basic"
                layout="vertical"
                style={{ width: "100%" }}
                autoComplete="off"
                form={form}
            >
                <Form.Item
                    label="Correo electrónico"
                    name="email"
                    key="email"
                    className={styles.label}
                    rules={[
                        { required: true, message: "Por favor ingresar usuario!" },
                    ]}>
                    <Input
                        prefix={<UserOutlined className={styles.icon} />}
                        style={{ width: "100%" }}
                        placeholder="usuario@gmail.com" />
                </Form.Item>
                <Form.Item
                    label="Contraseña"
                    name="password"
                    key="password"
                    className={styles.label}
                    rules={[
                        {
                            required: true,
                            message: "Porfavor ingresar contraseña!",
                        },
                    ]}>
                    <Input.Password
                        prefix={<LockOutlined className={styles.icon} />}
                        style={{ width: "100%" }}
                        placeholder="6+ caracteres requeridos"/>
                </Form.Item>
                <Row justify={"space-between"}>
                    <Col>
                        <Form.Item
                             name="rememberMe"
                             valuePropName="checked" 
                             initialValue={rememberMe}>
                                <Checkbox
                                    checked={rememberMe}
                                    onChange={handleRememberMeChange}
                                >
                                    Recuérdame
                                </Checkbox>                        
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item wrapperCol={{ span: 24, offset: 0 }}>
                    <Button
                        type="primary"
                        onClick={onFinishLogin}
                        block
                        size="large"
                        className={styles.btn}>
                        Iniciar Sesión como profesor
                    </Button>
                </Form.Item>
                <Divider className={styles.divider}>
                    <span className={styles.divider_text}>O</span>
                </Divider>
                <Form.Item wrapperCol={{ span: 24, offset: 0 }}>
                <Button
                    type="primary"
                    onClick={onFinishLoginGoogle}
                    block
                    size="large"
                    className={styles.btn}
                >
                    <GoogleOutlined /> Iniciar sesión como estudiante
                </Button>
                </Form.Item>
            </Form>
            <Row className={styles.footer_left}>
                <div>
                Desarrollado por <strong>Caballeros de Camelot</strong>
                </div>
            </Row>
            </div>
        </Col>
        <Col span={16} className={styles.col_right}>
            <div className={styles.login_rightSide}>
            <h1>Bienvenid@s al sistema Classroom AI</h1>
            <p className={`${styles.p_RightSide} ${styles.centeredText}`}>
                El sistema educativo de pase de lista y detección de participación
                basado en ML y visión computacional. Con el objetivo de medir la
                asistencia y participación en las aulas del tec. Identificar los
                rostros registrados. Medir la participación del alumno. Dashboard
                con la participación por alumno. Un portal que permite la
                administración de las clases y la detección de asistencia en tiempo
                real.
            </p>
            <Image
                src={icon_img}
                className={styles.img_RightSide}
                alt="Icon_template_Image"
            />
            {/* <Image
                src={bdd_img}
                className={styles.img_RightSide}
                alt="Bdd_template_Image"
            /> */}
            </div>
            <Row className={styles.footer}>
            <Col>
                Derechos reservados <strong>NDS Cognitive Labs</strong>
            </Col>
            <Col>
                Desarrollado por <strong>Caballeros de Camelot</strong>
            </Col>
            </Row>
        </Col>
        </Row>
    </div>
    );
}

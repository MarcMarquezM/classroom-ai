/* Porpiedad del equipo Caballeros de Camelot.
Descripcion de _app.js: modulo de JavaScript que rederiza el componente junto con las propiedades de la pagina. */

import '../globals.css'
import { AuthProvider } from "@/hooks/AuthContext";
import { UserProvider } from "@/hooks/UserContext";
import { StudentProvider } from '@/hooks/StudentContext';
import { CourseProvider } from '@/hooks/CourseContext';
import { DateProvider } from '@/hooks/DateContext';

export default function App({ Component, pageProps }) {  
    return (
    <UserProvider>
        <CourseProvider>
            <StudentProvider>
                <DateProvider>
                    <AuthProvider>
                        <Component {...pageProps} /> 
                    </AuthProvider>
                </DateProvider>
            </StudentProvider>
        </CourseProvider>
    </UserProvider>
    )
}

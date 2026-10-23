import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const AUTH_SESSION_KEY = 'icar_auth_session';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const clearSession = () => {
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        setUser(null);
    };

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get('/auth/me');

            setUser(response.data.user);

            sessionStorage.setItem(AUTH_SESSION_KEY, 'true');

            return response.data.user;
        } catch (error) {
            clearSession();
            throw error;
        }
    }, []);

    useEffect(() => {
        const restoreSession = async () => {
            /*
             * The server authentication cookie is the source of truth.
             * Do not depend on sessionStorage, otherwise a valid login
             * disappears when the browser tab is reopened.
             */
            try {
                await refreshUser();
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, [refreshUser]);

    const login = async (credentials) => {
        const response = await api.post('/auth/login', credentials);

        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');

        setUser(response.data.user);

        return response.data;
    };

    const register = async (payload) => {
        const response = await api.post('/auth/register', payload);

        sessionStorage.setItem(AUTH_SESSION_KEY, 'true');

        setUser(response.data.user);

        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearSession();
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

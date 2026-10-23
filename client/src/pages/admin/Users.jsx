import { useEffect, useState } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
export default function Users() {
    const [u, setU] = useState([]);
    const load = () => api.get('/admin/users').then((r) => setU(r.data.users || []));
    useEffect(() => {
        load();
    }, []);
    const toggle = async (id) => {
        try {
            await api.put(`/admin/users/${id}/block`);
            load();
        } catch (e) {
            Swal.fire('Error', e.response?.data?.message || 'Unable', 'error');
        }
    };
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">USERS</span>
                    <h1>Manage users.</h1>
                </div>
            </div>
            <div className="content-card table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {u.map((x) => (
                            <tr key={x._id}>
                                <td>
                                    {x.firstName} {x.lastName}
                                </td>
                                <td>{x.email}</td>
                                <td>{x.phone}</td>
                                <td>{x.role}</td>
                                <td>{x.isBlocked ? 'Blocked' : 'Active'}</td>
                                <td>
                                    {x.role !== 'ADMIN' && (
                                        <button className="table-btn" onClick={() => toggle(x._id)}>
                                            {x.isBlocked ? 'Unblock' : 'Block'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

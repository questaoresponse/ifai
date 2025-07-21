import axios from "axios";

const get = (url: string) => axios.get(url, {
    headers: {
        'Content-Type': 'application/json',
    }
});
const post = (url: string, data: any) => {
    if (data instanceof FormData){
        return axios.post(url, data, { 
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
    } else {
        return axios.post(url, data, { 
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
}

const auth = {
    get,
    post
}

export default auth;
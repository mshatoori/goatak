<template>
  <div class="login-container">
    <div class="login-box">
      <h2>GoATAK Login</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Username</label>
          <input v-model="username" type="text" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi, default as api } from '../api/axios';

const username = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();

const handleLogin = async () => {
    try {
        const response = await authApi.post('/login', {
            username: username.value,
            password: password.value
        });
        
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        
        // Update default header for future requests
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        
        router.push('/');
    } catch (err) {
        console.error(err);
        error.value = 'Invalid username or password';
    }
};
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #222;
    color: white;
}
.login-box {
    padding: 2rem;
    background: #333;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    width: 300px;
}
h2 {
    text-align: center;
    margin-bottom: 20px;
}
.form-group {
    margin-bottom: 1rem;
    color: #eee;
}
input {
    display: block;
    width: 100%;
    margin-top: 5px;
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #555;
    background: #444;
    color: white;
    box-sizing: border-box; 
}
button {
    width: 100%;
    padding: 10px;
    margin-top: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}
button:hover {
    background-color: #0056b3;
}
.error {
    color: #ff6b6b;
    margin-top: 15px;
    font-size: 0.9em;
    text-align: center;
}
</style>

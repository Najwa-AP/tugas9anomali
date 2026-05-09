## **Cara Menjalankan Service**

## **Daftar Endpoint yang Tersedia** 
GET `http://localhost:4077/auth/profile` (akses profil setelah login)

POST `http://localhost:4077/auth/register` (mendaftar sebagai user mahasiswa)

POST `http://localhost:4077/auth/register-admin` (mendaftar sebagai user admin)

POST `http://localhost:4077/auth/login` (login dengan akun yang sudah di regist)

POST `http://localhost:4077/auth/logout` (logout dengan akun yang sudah di regist)

GET `http://localhost:4077/complaints/laporan` (ambil laporan diri sendiri (mhs) / semua laporan (admin))

POST `http://localhost:4077/complaints/laporan` (buat laporan (mhs only))

PUT `http://localhost:4077/complaints/laporan/:id` (update status laporan (admin only))

DELETE `http://localhost:4077/complaints/laporan/:id` (hapus laporan (admin only))

## **Contoh Request & Response** 

## **Arsitektur Sistem**
![Arsitektur](docs/Arsitektur.png).
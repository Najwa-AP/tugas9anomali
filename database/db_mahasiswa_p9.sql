SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `mahasiswa` (
  `nim` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `prodi` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `mahasiswa` (`nim`, `user_id`, `nama`, `prodi`) VALUES
(1234, 2, 'Zahra', 'Informatika'),
(210101, 3, 'Zahra Putri', 'psikologi');

CREATE TABLE `pengaduan` (
  `id` int(11) NOT NULL,
  `nim_pelapor` int(11) NOT NULL,
  `isi_laporan` text NOT NULL,
  `status` enum('pending','proses','selesai') DEFAULT 'pending',
  `tgl_lapor` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `pengaduan` (`id`, `nim_pelapor`, `isi_laporan`, `status`, `tgl_lapor`) VALUES
(1, 1234, 'Fasilitas kursi di Lab 3 banyak yang rusak.', 'proses', '2026-05-06 12:27:33');

CREATE TABLE `token_blacklist` (
  `id` int(11) NOT NULL,
  `token` text NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `token_blacklist` (`id`, `token`, `expires_at`) VALUES
(1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJ6YWhyYSIsImlhdCI6MTc3ODMyODI5NywiZXhwIjoxNzc4MzI5MTk3fQ.OA3gjqJaIgVNCvk7jaHvpU-jVcHStqTYp-v45o5wiJw', '2026-05-09 05:19:57'),
(2, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJ6YWhyYSIsInJvbGUiOiJtYWhhc2lzd2EiLCJpYXQiOjE3NzgzMjgzODksImV4cCI6MTc3ODMzMTA4OX0.kf0flpIOjE4buOeQjhhWeSCWNSvT6IVBqqOD8-Wf5KI', '2026-05-09 05:51:29');

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','mahasiswa') DEFAULT 'mahasiswa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `username`, `password`, `role`) VALUES
(2, 'zahra123', '$2a$10$m6N9vA7o9v5zG9V.S5Y9/.8U8Xv6G8R8q8Y6S8v8Xv6G8R8q8Y6S', 'mahasiswa'),
(3, 'zahra', '$2b$10$uSNbH4cTBCsM8w1cSEPwiuHmWN6KIIptJPO5J.8YRVQiN7P.LOo1G', 'mahasiswa'),
(4, 'admin_it', '$2b$10$M/DbuHMs7Ct7oyQ0Guxgi.vCUg0vvUrN8BT/symyRnHwXR0YvC6d6', 'admin');

ALTER TABLE `mahasiswa`
  ADD PRIMARY KEY (`nim`),
  ADD UNIQUE KEY `user_id` (`user_id`);

ALTER TABLE `pengaduan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mhs_pengaduan` (`nim_pelapor`);

ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

ALTER TABLE `pengaduan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `token_blacklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

ALTER TABLE `mahasiswa`
  ADD CONSTRAINT `fk_user_mhs` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `pengaduan`
  ADD CONSTRAINT `fk_mhs_pengaduan` FOREIGN KEY (`nim_pelapor`) REFERENCES `mahasiswa` (`nim`) ON DELETE CASCADE;
COMMIT;
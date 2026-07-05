-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: ramsun_solar
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `project_files`
--

DROP TABLE IF EXISTS `project_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `file_url` text NOT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `project_files_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_files_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_files`
--

LOCK TABLES `project_files` WRITE;
/*!40000 ALTER TABLE `project_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_steps`
--

DROP TABLE IF EXISTS `project_steps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_steps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `status` enum('pending','completed') DEFAULT 'pending',
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `project_steps_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_steps_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_steps`
--

LOCK TABLES `project_steps` WRITE;
/*!40000 ALTER TABLE `project_steps` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_steps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `capacity` varchar(10) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Registration',
  `step` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `site_photo` varchar(500) DEFAULT NULL,
  `agreement` varchar(500) DEFAULT NULL,
  `quotation` varchar(500) DEFAULT NULL,
  `loan_approved` tinyint(1) DEFAULT 0,
  `client_id` varchar(8) DEFAULT NULL,
  `failed_document` varchar(255) DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `client_id` (`client_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (7,'Sagar Dhiman','7017708827','sagarsagar46605@gmail.com','','','Loan Process',4,'2026-07-05 11:19:18','2026-07-05 11:20:53',NULL,NULL,NULL,1,'56604513',NULL,NULL),(8,'Sagar Dhiman','7017708827','sagarsagar46605@gmail.com','','','Installation',5,'2026-07-05 11:36:25','2026-07-05 11:41:22',NULL,NULL,NULL,0,'76872554',NULL,NULL),(9,'Sagar Dhiman','7017708827','sagarsagar46605@gmail.com','','','Document Upload',1,'2026-07-05 11:42:12','2026-07-05 11:42:12','/uploads/1783251732439-photo_6134397649264774749_y.jpg','/uploads/1783251732474-Spotted in Prod (@spottedinprod) on X.jfif','/uploads/1783251732499-photo_6134397649264774749_y.jpg',0,'37149391',NULL,NULL),(10,'saga','7017708827','sagarsagar46605@gmail.com','','','Document Upload',1,'2026-07-05 11:54:43','2026-07-05 11:54:43','/uploads/1783252482865-1000056768.jpg','/uploads/1783252482942-Screenshot_2026-07-05-13-35-23-73_1c337646f29875672b5a61192b9010f9.jpg','/uploads/1783252483086-Screenshot_2026-07-04-23-52-21-13_6012fa4d4ddec268fc5c7112cbb265e7.jpg',0,'10210744',NULL,NULL);
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','solar_team','back_office','office','employee','dispatch') NOT NULL DEFAULT 'employee',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@ramsun.com','$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G','admin','2026-07-02 19:55:04'),(2,'team@ramsun.com','$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G','solar_team','2026-07-02 19:55:04'),(3,'office@ramsun.com','$2a$10$wYpS3D.N/qJc3R7J4lX3x.H1W/Jq9x.9lTq0Z4I3x9/Q1wQ/O9M5G','back_office','2026-07-02 19:55:04'),(4,'sagardhiman45605@gmail.com','$2b$10$yhpguT2qGTfSwvXq1G96kuzYkIjhDiXyVmXIaK.lVzoizWCETeiXC','employee','2026-07-02 19:58:22'),(5,'sagarsagar46605@gmail.com','$2b$10$9EDC7TRWq4mzQImZD8aZmuxSDF22dUosRPzUTZsq95LSH5JIv45fe','employee','2026-07-04 16:27:56');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-06  0:19:10

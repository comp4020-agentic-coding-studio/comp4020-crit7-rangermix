CREATE TABLE `classes` (
	`session_id` text NOT NULL,
	`class_number` integer NOT NULL,
	`course_code` text NOT NULL,
	`mode` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`last_day_to_enrol` text NOT NULL,
	`census_date` text NOT NULL,
	`topic` text,
	PRIMARY KEY(`session_id`, `class_number`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classes_course_idx` ON `classes` (`course_code`);--> statement-breakpoint
CREATE TABLE `courses` (
	`code` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`catalogue` text NOT NULL,
	`level` integer NOT NULL,
	`title` text NOT NULL,
	`career` text NOT NULL,
	`units` real NOT NULL,
	`description` text NOT NULL,
	`requisites` text,
	`max_takes` integer DEFAULT 1 NOT NULL,
	`pc_url` text NOT NULL,
	FOREIGN KEY (`subject`) REFERENCES `subjects`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`class_number` integer NOT NULL,
	`status` text NOT NULL,
	`grade` text,
	`enrolled_on` text NOT NULL,
	`dropped_on` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`,`class_number`) REFERENCES `classes`(`session_id`,`class_number`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_live_uq` ON `enrolments` (`student_id`,`session_id`,`class_number`) WHERE status = 'enrolled';--> statement-breakpoint
CREATE INDEX `enrolments_student_idx` ON `enrolments` (`student_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`career` text NOT NULL,
	`units` real,
	`acronym` text,
	`post_nominal` text,
	`pc_url` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `program_plans` (
	`program_code` text NOT NULL,
	`plan_code` text NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`program_code`, `plan_code`),
	FOREIGN KEY (`program_code`) REFERENCES `plans`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plan_code`) REFERENCES `plans`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirement_courses` (
	`group_id` integer NOT NULL,
	`course_code` text NOT NULL,
	`times` integer DEFAULT 1 NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`group_id`, `course_code`),
	FOREIGN KEY (`group_id`) REFERENCES `requirement_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_code`) REFERENCES `courses`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `requirement_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_code` text NOT NULL,
	`rules_year` integer NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	`rule` text NOT NULL,
	`min_units` real,
	`text` text NOT NULL,
	FOREIGN KEY (`plan_code`) REFERENCES `plans`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `requirement_groups_plan_uq` ON `requirement_groups` (`plan_code`,`rules_year`,`position`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`year` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`exam_start` text,
	`exam_end` text,
	`last_day_to_add` text,
	`census_date` text,
	`drop_no_fail_date` text,
	`enrol_opens` text,
	`enrol_opens_text` text
);
--> statement-breakpoint
CREATE TABLE `student_plans` (
	`student_id` integer NOT NULL,
	`plan_code` text NOT NULL,
	PRIMARY KEY(`student_id`, `plan_code`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_code`) REFERENCES `plans`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text,
	`name` text NOT NULL,
	`uid` text NOT NULL,
	`program_code` text NOT NULL,
	`rules_year` integer NOT NULL,
	`commenced_session_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`program_code`) REFERENCES `plans`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`commenced_session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_token_unique` ON `students` (`token`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);

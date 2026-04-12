<?php
// profile.php - Enhanced Student Promotion System with Level and Program Tracking
include("connection.php");
session_start();

// Check if user is logged in as teacher/admin
if (!isset($_SESSION['id'])) {
    header("location:index.html");
    exit();
}

// Enhanced debugging
error_log("=== PROFILE.PHP ACCESSED ===");
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("POST Data: " . print_r($_POST, true));

// Function to get student's current level from class table
function getStudentCurrentLevel($conn, $studentClassId) {
    if (!$studentClassId) {
        error_log("DEBUG: getStudentCurrentLevel - No class ID provided");
        return null;
    }
    
    $query = "SELECT c.level, c.level as class_name FROM class c WHERE c.cid = ?";
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Class level query failed: " . mysqli_error($conn));
        return null;
    }
    
    mysqli_stmt_bind_param($stmt, "i", $studentClassId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $classData = mysqli_fetch_assoc($result);
    
    if (!$classData) {
        error_log("DEBUG: getStudentCurrentLevel - No class found for ID: $studentClassId");
    }
    
    return $classData ? $classData : null;
}

// Function to extract level code from class name (fallback)
function extractLevelCode($className) {
    if (preg_match('/(L\d+)/i', $className, $matches)) {
        return strtoupper($matches[1]);
    }
    return $className; // Return original if no level pattern found
}

// Function to create required tables if they don't exist
function createRequiredTables($conn) {
    $tables = [];
    
    // Check and create class_levels table
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'class_levels'");
    if (mysqli_num_rows($result) === 0) {
        $createClassLevels = "CREATE TABLE class_levels (
            level_id INT AUTO_INCREMENT PRIMARY KEY,
            level_code VARCHAR(10) NOT NULL UNIQUE,
            level_name VARCHAR(100) NOT NULL,
            next_level_id INT NULL,
            is_final_level BOOLEAN DEFAULT FALSE,
            credit_requirements INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        if (mysqli_query($conn, $createClassLevels)) {
            // Insert default class levels
            $insert1 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L3', 'Level 3', 0)";
            $insert2 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L4', 'Level 4', 0)";
            $insert3 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L5', 'Level 5', 1)";
            
            mysqli_query($conn, $insert1);
            mysqli_query($conn, $insert2);
            mysqli_query($conn, $insert3);
            
            // Update next_level_id relationships
            mysqli_query($conn, "UPDATE class_levels SET next_level_id = 2 WHERE level_code = 'L3'");
            mysqli_query($conn, "UPDATE class_levels SET next_level_id = 3 WHERE level_code = 'L4'");
            
            $tables[] = "class_levels created with default levels (L3 → L4 → L5)";
        }
    } else {
        // Check if class_levels has data, if not insert default levels
        $countResult = mysqli_query($conn, "SELECT COUNT(*) as count FROM class_levels");
        $countData = mysqli_fetch_assoc($countResult);
        if ($countData['count'] == 0) {
            $insert1 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L3', 'Level 3', 0)";
            $insert2 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L4', 'Level 4', 0)";
            $insert3 = "INSERT INTO class_levels (level_code, level_name, is_final_level) VALUES ('L5', 'Level 5', 1)";
            
            mysqli_query($conn, $insert1);
            mysqli_query($conn, $insert2);
            mysqli_query($conn, $insert3);
            
            mysqli_query($conn, "UPDATE class_levels SET next_level_id = 2 WHERE level_code = 'L3'");
            mysqli_query($conn, "UPDATE class_levels SET next_level_id = 3 WHERE level_code = 'L4'");
            
            $tables[] = "Default levels inserted into class_levels";
        }
    }
    
    // Check and create programs table if it doesn't exist
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'programs'");
    if (mysqli_num_rows($result) === 0) {
        $createPrograms = "CREATE TABLE programs (
            program_id INT AUTO_INCREMENT PRIMARY KEY,
            program_name VARCHAR(100) NOT NULL,
            program_code VARCHAR(20) UNIQUE,
            duration_years INT DEFAULT 3,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )";
        if (mysqli_query($conn, $createPrograms)) {
            // Insert default programs based on common trades
            $defaultPrograms = [
                "Computer Science", "Electrical Engineering", "Mechanical Engineering", 
                "Civil Engineering", "Business Administration", "Hospitality Management"
            ];
            
            foreach ($defaultPrograms as $program) {
                $programCode = strtoupper(substr(str_replace(' ', '', $program), 0, 6));
                $insert = "INSERT INTO programs (program_name, program_code) VALUES ('$program', '$programCode')";
                mysqli_query($conn, $insert);
            }
            
            $tables[] = "programs created with default programs";
        }
    }
    
    // Check and create student_academic_history table
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'student_academic_history'");
    if (mysqli_num_rows($result) === 0) {
        $createHistory = "CREATE TABLE student_academic_history (
            history_id INT AUTO_INCREMENT PRIMARY KEY,
            sid INT NOT NULL,
            academic_year VARCHAR(9) NOT NULL,
            program_id INT NULL,
            class_level VARCHAR(50),
            status ENUM('active', 'promoted', 'repeated', 'graduated', 'transferred') DEFAULT 'active',
            total_marks DECIMAL(5,2) NULL,
            average DECIMAL(5,2),
            decision ENUM('promote', 'repeat', 'graduate') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sid) REFERENCES student(sid) ON DELETE CASCADE,
            INDEX idx_sid_year (sid, academic_year),
            INDEX idx_year_status (academic_year, status)
        )";
        if (mysqli_query($conn, $createHistory)) {
            $tables[] = "student_academic_history created";
        }
    }
    
    // Check and create student_promotion_log table
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'student_promotion_log'");
    if (mysqli_num_rows($result) === 0) {
        $createPromotionLog = "CREATE TABLE student_promotion_log (
            log_id INT AUTO_INCREMENT PRIMARY KEY,
            sid INT NOT NULL,
            from_year VARCHAR(9) NOT NULL,
            to_year VARCHAR(9) NOT NULL,
            program_id INT,
            from_level VARCHAR(50),
            to_level VARCHAR(50),
            decision ENUM('promoted', 'repeated', 'graduated') NOT NULL,
            average_mark DECIMAL(5,2),
            total_marks DECIMAL(5,2),
            processed_by INT, -- Teacher/Admin who processed
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            remarks TEXT,
            INDEX idx_sid_year (sid, from_year)
        )";
        if (mysqli_query($conn, $createPromotionLog)) {
            $tables[] = "student_promotion_log created";
        }
    }
    
    return $tables;
}

// Function to validate year range format and existence in DB
function validateYearRange($yearRange, $conn) {
    if (!preg_match('/^(\d{4})-(\d{4})$/', $yearRange, $matches)) {
        return ['error' => "Invalid year format. Must be in format YYYY-YYYY (e.g., 2025-2026)"];
    }
    
    $startYear = (int)$matches[1];
    $endYear = (int)$matches[2];
    
    if ($endYear !== $startYear + 1) {
        return ['error' => "Years must be consecutive (e.g., 2025-2026)"];
    }
    
    $checkQuery = "SELECT year_id, year, status FROM year WHERE year = ? LIMIT 1";
    $stmt = mysqli_prepare($conn, $checkQuery);
    if (!$stmt) {
        return ['error' => "Database error: " . mysqli_error($conn)];
    }
    
    mysqli_stmt_bind_param($stmt, "s", $yearRange);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if (mysqli_num_rows($result) === 0) {
        return ['error' => "Academic year $yearRange not found in system"];
    }
    
    return mysqli_fetch_assoc($result);
}

// Function to get all academic years from database
function getAcademicYears($conn) {
    $years = [];
    $query = "SELECT year_id, year, status FROM year ORDER BY year DESC";
    $result = mysqli_query($conn, $query);
    if ($result) {
        while ($row = mysqli_fetch_assoc($result)) {
            $years[] = $row;
        }
    }
    return $years;
}

// Function to get program_id from program name
function getProgramId($conn, $programName) {
    if (empty($programName)) {
        return null;
    }
    
    // Try to match by program name
    $query = "SELECT program_id FROM programs WHERE program_name LIKE ? LIMIT 1";
    $stmt = mysqli_prepare($conn, $query);
    if ($stmt) {
        $searchTerm = "%" . $programName . "%";
        mysqli_stmt_bind_param($stmt, "s", $searchTerm);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $row = mysqli_fetch_assoc($result);
        return $row ? $row['program_id'] : null;
    }
    return null;
}

// Function to get class level progression
function getClassProgression($conn, $currentLevel) {
    $query = "SELECT cl.level_id, cl.level_code, cl.level_name, cl.next_level_id, cl.is_final_level,
                     cl_next.level_code as next_level_code, cl_next.level_name as next_level_name
              FROM class_levels cl
              LEFT JOIN class_levels cl_next ON cl.next_level_id = cl_next.level_id
              WHERE cl.level_code = ?";
    
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Class progression query failed: " . mysqli_error($conn));
        return null;
    }
    
    mysqli_stmt_bind_param($stmt, "s", $currentLevel);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $progression = mysqli_fetch_assoc($result);
    
    return $progression;
}

// Function to get next level based on current level
function getNextLevel($conn, $currentLevel) {
    $progression = getClassProgression($conn, $currentLevel);
    
    if ($progression && $progression['next_level_code'] && !$progression['is_final_level']) {
        return $progression['next_level_code'];
    }
    
    return null; // No next level (graduation or invalid level)
}

// Function to check if level is final
function isFinalLevel($conn, $currentLevel) {
    $progression = getClassProgression($conn, $currentLevel);
    return $progression && $progression['is_final_level'];
}

// Function to get next class ID based on current level and program
function getNextClassId($conn, $currentLevel, $programId) {
    // Get the next level
    $nextLevel = getNextLevel($conn, $currentLevel);
    if (!$nextLevel) {
        return null; // No next level (graduation)
    }
    
    // Find the class with the next level for the same program
    $query = "SELECT c.cid FROM class c 
              WHERE c.level = ? 
              AND (c.program_id = ? OR c.program_id IS NULL)
              ORDER BY c.cid LIMIT 1";
    
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Next class query failed: " . mysqli_error($conn));
        return null;
    }
    
    mysqli_stmt_bind_param($stmt, "si", $nextLevel, $programId);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $class = mysqli_fetch_assoc($result);
    
    return $class ? $class['cid'] : null;
}

// ENHANCED Function to check student promotion eligibility with program tracking
function checkStudentPromotionEligibility($conn, $sid, $yearRange) {
    // First check if ranks table exists
    $tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'ranks'");
    if (mysqli_num_rows($tableCheck) === 0) {
        error_log("DEBUG: Ranks table does not exist");
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'Ranks table does not exist'
        ];
    }
    
    // Check if yearl_pass column exists
    $columnCheck = mysqli_query($conn, "SHOW COLUMNS FROM ranks LIKE 'yearl_pass'");
    if (mysqli_num_rows($columnCheck) === 0) {
        error_log("DEBUG: yearl_pass column does not exist in ranks table");
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'yearl_pass column does not exist in ranks table'
        ];
    }
    
    // ENHANCED QUERY: Get student data with program and class information
    $query = "SELECT r.yearl_pass, s.trade, s.class, s.program_id, c.level as class_level, c.level as class_name
              FROM ranks r 
              JOIN student s ON r.sit = s.sid 
              LEFT JOIN class c ON s.class = c.cid
              WHERE r.sit = ? LIMIT 1";
    
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        error_log("Ranks query preparation failed: " . mysqli_error($conn));
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'Database query preparation failed: ' . mysqli_error($conn)
        ];
    }
    
    mysqli_stmt_bind_param($stmt, "i", $sid);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Ranks query execution failed: " . mysqli_stmt_error($stmt));
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'Database query execution failed: ' . mysqli_stmt_error($stmt)
        ];
    }
    
    $result = mysqli_stmt_get_result($stmt);
    if (!$result) {
        error_log("Failed to get result from ranks query: " . mysqli_error($conn));
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'Failed to retrieve data from database'
        ];
    }
    
    $rankData = mysqli_fetch_assoc($result);
    
    // If no data found in ranks table
    if (!$rankData) {
        error_log("DEBUG: No academic record found for student $sid in ranks table");
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => null,
            'reason' => 'No academic record found for this student in ranks table'
        ];
    }
    
    $yearlPass = $rankData['yearl_pass'];
    $programName = $rankData['trade'] ?? null;
    $classId = $rankData['class'] ?? null;
    $programId = $rankData['program_id'] ?? null;
    $classLevel = $rankData['class_level'] ?? null;
    $className = $rankData['class_name'] ?? null;
    
    error_log("DEBUG: Student $sid - yearl_pass: $yearlPass, class_id: $classId, class_level: $classLevel");
    
    // Check if yearl_pass is available and valid
    if ($yearlPass === null || $yearlPass === '' || $yearlPass == 0) {
        error_log("DEBUG: Student $sid - yearl_pass is empty, zero, or not available");
        return [
            'eligible' => false,
            'average' => 0,
            'yearl_pass' => $yearlPass,
            'program_name' => $programName,
            'class_id' => $classId,
            'class_level' => $classLevel,
            'class_name' => $className,
            'program_id' => $programId,
            'reason' => 'Yearly pass mark is empty, zero, or not available'
        ];
    }
    
    $average = (float)$yearlPass;
    $isEligible = ($average >= 60);
    
    error_log("DEBUG: Student $sid - Average: $average, Eligible: " . ($isEligible ? 'YES' : 'NO'));
    
    return [
        'eligible' => $isEligible,
        'average' => $average,
        'yearl_pass' => $yearlPass,
        'program_name' => $programName,
        'class_id' => $classId,
        'class_level' => $classLevel,
        'class_name' => $className,
        'program_id' => $programId,
        'reason' => $isEligible ? 
            "Meets promotion criteria (yearl_pass ≥ 60%)" : 
            "Does not meet promotion criteria (yearl_pass < 60%)"
    ];
}

// FIXED Function to create academic history record with program_id
function createAcademicHistoryRecord($conn, $studentData, $yearRange, $decision, $eligibility) {
    // Check if record already exists for this student and year
    $checkQuery = "SELECT history_id FROM student_academic_history WHERE sid = ? AND academic_year = ?";
    $checkStmt = mysqli_prepare($conn, $checkQuery);
    $recordExists = false;
    $historyId = null;
    
    if ($checkStmt) {
        mysqli_stmt_bind_param($checkStmt, "is", $studentData['sid'], $yearRange);
        mysqli_stmt_execute($checkStmt);
        $result = mysqli_stmt_get_result($checkStmt);
        
        if (mysqli_num_rows($result) > 0) {
            $recordExists = true;
            $row = mysqli_fetch_assoc($result);
            $historyId = $row['history_id'];
        }
    }
    
    // Get program_id from student's data
    $programId = $eligibility['program_id'] ?? getProgramId($conn, $studentData['trade']);
    
    if ($recordExists) {
        // Update existing record with program_id
        $updateQuery = "UPDATE student_academic_history 
                       SET program_id = ?, class_level = ?, status = ?, average = ?, decision = ?, created_at = CURRENT_TIMESTAMP 
                       WHERE history_id = ?";
        $updateStmt = mysqli_prepare($conn, $updateQuery);
        if ($updateStmt) {
            $status = $decision === 'graduate' ? 'graduated' : 
                     ($decision === 'promote' ? 'promoted' : 'repeated');
            
            $class_level = $eligibility['class_level'] ?? $studentData['class'];
            
            mysqli_stmt_bind_param($updateStmt, "isssdi", 
                $programId,
                $class_level, 
                $status,
                $eligibility['average'],
                $decision,
                $historyId
            );
            return mysqli_stmt_execute($updateStmt);
        }
    } else {
        // Insert new record with program_id
        $query = "INSERT INTO student_academic_history 
                  (sid, academic_year, program_id, class_level, status, total_marks, average, decision) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = mysqli_prepare($conn, $query);
        
        if (!$stmt) {
            error_log("Academic history record creation failed: " . mysqli_error($conn));
            return false;
        }
        
        $status = $decision === 'graduate' ? 'graduated' : 
                 ($decision === 'promote' ? 'promoted' : 'repeated');
        
        $sid = $studentData['sid'];
        $class_level = $eligibility['class_level'] ?? $studentData['class'];
        $total_marks = null;
        $average_val = $eligibility['average'];
        
        mysqli_stmt_bind_param($stmt, "isissdds", 
            $sid,                    // i - integer
            $yearRange,              // s - string
            $programId,              // i - integer (can be NULL)
            $class_level,            // s - string
            $status,                 // s - string
            $total_marks,            // d - decimal (can be NULL)
            $average_val,            // d - decimal
            $decision                // s - string
        );
        
        $result = mysqli_stmt_execute($stmt);
        if (!$result) {
            error_log("Academic history insert failed: " . mysqli_stmt_error($stmt));
        }
        return $result;
    }
    
    return false;
}

// CORRECTED Function to log promotion decision with proper level progression tracking
function logPromotionDecision($conn, $sid, $fromYear, $toYear, $fromClassId, $toClassId, $decision, $eligibility, $processedBy) {
    // Get program_id for the student
    $programId = $eligibility['program_id'] ?? getProgramId($conn, $eligibility['program_name']);
    
    // Get class information for from_class
    $fromClassInfo = getStudentCurrentLevel($conn, $fromClassId);
    $fromLevel = $fromClassInfo ? $fromClassInfo['level'] : 'UNKNOWN';
    $fromClassName = $fromClassInfo ? $fromClassInfo['class_name'] : 'Unknown Class';
    
    // Determine to_level based on the decision
    $toLevel = 'UNKNOWN';
    
    if ($decision === 'graduated') {
        $toLevel = 'GRADUATED';
    } elseif ($decision === 'repeated') {
        $toLevel = $fromLevel; // Same level when repeating
    } elseif ($decision === 'promoted') {
        // Get the next level for promotion
        $toLevel = getNextLevel($conn, $fromLevel);
        if (!$toLevel) {
            $toLevel = 'UNKNOWN'; // Fallback if next level not found
        }
    }
    
    // Get to class information if available
    $toClassInfo = $toClassId ? getStudentCurrentLevel($conn, $toClassId) : null;
    $toClassName = $toClassInfo ? $toClassInfo['class_name'] : ($decision === 'graduated' ? 'Graduated' : 'Unknown Class');
    
    $query = "INSERT INTO student_promotion_log 
              (sid, from_year, to_year, program_id, from_level, to_level, decision, average_mark, total_marks, processed_by, remarks) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = mysqli_prepare($conn, $query);
    
    if (!$stmt) {
        error_log("Promotion log creation failed: " . mysqli_error($conn));
        return false;
    }
    
    $remarks = "Yearly Pass Mark: " . ($eligibility['yearl_pass'] ?? 'N/A') . "%, " . 
               "Decision: " . $eligibility['reason'] . ", " .
               "From Class: " . $fromClassName . " (" . $fromLevel . ") → To Class: " . $toClassName . " (" . $toLevel . ")";
    
    $totalMarks = $eligibility['average']; // Using average as total marks for simplicity
    
    mysqli_stmt_bind_param($stmt, "ississsddis", 
        $sid, $fromYear, $toYear, $programId, $fromLevel, $toLevel, $decision, 
        $eligibility['average'], $totalMarks, $processedBy, $remarks
    );
    
    $result = mysqli_stmt_execute($stmt);
    if (!$result) {
        error_log("Promotion log insert failed: " . mysqli_stmt_error($stmt));
    }
    
    error_log("Promotion log created: Student $sid, From: $fromLevel → To: $toLevel, Decision: $decision");
    
    return $result;
}

// FIXED Function to determine next class based on current level, program, and eligibility
function determineNextClass($conn, $currentClassId, $programId, $isEligible) {
    // Get current class level
    $currentClassInfo = getStudentCurrentLevel($conn, $currentClassId);
    if (!$currentClassInfo) {
        error_log("DEBUG: Cannot find class information for class ID: $currentClassId");
        return $currentClassId; // Stay in same class if class not found
    }
    
    $currentLevel = $currentClassInfo['level'];
    $currentClassName = $currentClassInfo['class_name'];
    
    error_log("DEBUG: Current Class ID: $currentClassId, Level: $currentLevel, Name: $currentClassName");
    
    // Check if this is the final level
    if (isFinalLevel($conn, $currentLevel)) {
        if ($isEligible) {
            return null; // Graduate from final level
        } else {
            return $currentClassId; // Repeat final level
        }
    }
    
    // For non-final levels
    if ($isEligible) {
        // Eligible: Move to next level
        $nextClassId = getNextClassId($conn, $currentLevel, $programId);
        if ($nextClassId) {
            $nextClassInfo = getStudentCurrentLevel($conn, $nextClassId);
            error_log("DEBUG: Next Class ID: $nextClassId, Level: " . ($nextClassInfo ? $nextClassInfo['level'] : 'UNKNOWN'));
            return $nextClassId;
        } else {
            error_log("DEBUG: No next class found for level: $currentLevel, program: $programId");
            return $currentClassId; // Stay in same class if no next class found
        }
    } else {
        // Not eligible: Repeat same level
        error_log("DEBUG: Student not eligible, repeating class: $currentClassId");
        return $currentClassId;
    }
}

// CORRECTED promotion function with proper debugging
function promoteStudentsWithHistory($conn, $yearRange, $processedBy) {
    // Validate year range
    $yearData = validateYearRange($yearRange, $conn);
    if (isset($yearData['error'])) {
        return ['error' => $yearData['error']];
    }
    
    $currentYearRange = $yearData['year'];
    
    // Calculate next year range
    $nextYearRange = (int)substr($currentYearRange, 0, 4) + 1 . '-' . ((int)substr($currentYearRange, 5, 4) + 1);
    
    // Verify next year exists, if not create it
    $checkNextYear = mysqli_query($conn, "SELECT year_id FROM year WHERE year = '$nextYearRange' LIMIT 1");
    if (mysqli_num_rows($checkNextYear) === 0) {
        $insertResult = mysqli_query($conn, "INSERT INTO year (year, status) VALUES ('$nextYearRange', 'inactive')");
        if (!$insertResult) {
            error_log("Failed to create next academic year: " . mysqli_error($conn));
            return ['error' => "Failed to create next academic year: $nextYearRange"];
        }
    }
    
    // DEBUG: Check how many active students exist
    $countQuery = "SELECT COUNT(*) as total FROM student WHERE status = 'active'";
    $countResult = mysqli_query($conn, $countQuery);
    $totalStudents = mysqli_fetch_assoc($countResult)['total'];
    error_log("DEBUG: Total active students found: " . $totalStudents);
    
    // Check if there are any students at all
    if ($totalStudents == 0) {
        return ['error' => "No active students found in the system."];
    }
    
    // UPGRADED QUERY: Get all active students with their program and class information
    $query = "SELECT s.sid, s.firstname, s.lastname, s.class as class_id, s.district, s.secter, s.trade, s.program_id, s.status,
                     c.level as class_level, c.class_name as class_name
              FROM student s
              LEFT JOIN class c ON s.class = c.cid
              WHERE s.status = 'active'";
    
    $result = mysqli_query($conn, $query);
    if (!$result) {
        error_log("DEBUG: Student query failed: " . mysqli_error($conn));
        return ['error' => "Failed to get students: " . mysqli_error($conn)];
    }
    
    $promoted = 0;
    $repeated = 0;
    $graduated = 0;
    $errors = [];
    $detailedResults = [];
    
    $studentsProcessed = 0;
    
    while ($student = mysqli_fetch_assoc($result)) {
        $studentsProcessed++;
        $sid = $student['sid'];
        $currentClassId = $student['class_id'];
        $currentClassName = $student['class_name'] ?? 'Unknown Class';
        $currentClassLevel = $student['class_level'] ?? 'UNKNOWN';
        $programId = $student['program_id'];
        
        error_log("DEBUG: Processing student #$studentsProcessed: {$student['firstname']} {$student['lastname']} (ID: $sid)");
        error_log("DEBUG: Current Class: ID=$currentClassId, Level=$currentClassLevel, Name=$currentClassName");
        
        // Check if student has a valid class assignment
        if (!$currentClassId || $currentClassId == 0) {
            error_log("DEBUG: Student $sid has no valid class assignment (class_id: $currentClassId)");
            $errors[] = "Student {$student['firstname']} {$student['lastname']} has no valid class assignment";
            continue;
        }
        
        try {
            // Begin transaction for each student
            mysqli_begin_transaction($conn);
            
            // Check student eligibility with program information
            $eligibility = checkStudentPromotionEligibility($conn, $sid, $currentYearRange);
            
            error_log("DEBUG: Student $sid eligibility: " . ($eligibility['eligible'] ? 'ELIGIBLE' : 'NOT ELIGIBLE') . 
                     ", yearl_pass: " . ($eligibility['yearl_pass'] ?? 'N/A') . 
                     ", program_id: " . ($eligibility['program_id'] ?? 'N/A') .
                     ", current_level: " . ($eligibility['class_level'] ?? 'N/A') .
                     ", reason: " . $eligibility['reason']);
            
            $averageScore = $eligibility['average'];
            $isEligible = $eligibility['eligible'];
            $studentProgramId = $eligibility['program_id'] ?? $programId;
            $currentLevel = $eligibility['class_level'] ?? $currentClassLevel;
            
            // Determine next class based on eligibility and progression
            $nextClassId = determineNextClass($conn, $currentClassId, $studentProgramId, $isEligible);
            
            // Get next class information
            $nextClassInfo = $nextClassId ? getStudentCurrentLevel($conn, $nextClassId) : null;
            $nextClassName = $nextClassInfo ? $nextClassInfo['class_name'] : 'GRADUATED';
            $nextClassLevel = $nextClassInfo ? $nextClassInfo['level'] : 'GRADUATED';
            
            error_log("DEBUG: Current class: $currentClassId ($currentClassLevel) → Next class: " . 
                     ($nextClassId ? "$nextClassId ($nextClassLevel)" : 'GRADUATED') . 
                     ", Eligible: " . ($isEligible ? 'YES' : 'NO'));
            
            // Determine promotion decision with proper log decision
            $decision = 'promote';
            $logDecision = 'promoted';
            
            if ($nextClassId === null) {
                // Graduate student (final level + eligible)
                $decision = 'graduate';
                $logDecision = 'graduated';
                $graduated++;
                error_log("DEBUG: Student $sid: GRADUATED from $currentClassName ($currentClassLevel)");
            } elseif ($nextClassId === $currentClassId && !$isEligible) {
                // Repeat same level (not eligible)
                $decision = 'repeat';
                $logDecision = 'repeated';
                $repeated++;
                error_log("DEBUG: Student $sid: REPEATED $currentClassName ($currentClassLevel)");
            } else {
                // Promote to next level (eligible + has next level)
                $promoted++;
                $logDecision = 'promoted';
                error_log("DEBUG: Student $sid: PROMOTED from $currentClassName ($currentClassLevel) → $nextClassName ($nextClassLevel)");
            }
            
            // Create academic history for current year with program tracking
            $historyResult = createAcademicHistoryRecord($conn, $student, $currentYearRange, $decision, $eligibility);
            if (!$historyResult) {
                $errors[] = "Failed to create academic history for student {$student['firstname']} {$student['lastname']}";
                error_log("DEBUG: Failed to create academic history for student $sid");
            }
            
            // Log promotion decision with proper level progression
            $logResult = logPromotionDecision($conn, $sid, $currentYearRange, $nextYearRange, 
                               $currentClassId, $nextClassId ?? $currentClassId, $logDecision, $eligibility, $processedBy);
            if (!$logResult) {
                $errors[] = "Failed to log promotion decision for student {$student['firstname']} {$student['lastname']}";
                error_log("DEBUG: Failed to log promotion decision for student $sid");
            }
            
            // Store detailed results for reporting
            $detailedResult = [
                'sid' => $sid,
                'name' => $student['firstname'] . ' ' . $student['lastname'],
                'current_class_id' => $currentClassId,
                'current_class_name' => $currentClassName,
                'current_level' => $currentClassLevel,
                'next_class_id' => $nextClassId,
                'next_class_name' => $nextClassName,
                'next_level' => $nextClassLevel,
                'decision' => $decision,
                'average' => $averageScore,
                'is_eligible' => $isEligible,
                'yearl_pass' => $eligibility['yearl_pass'] ?? 'N/A',
                'program' => $eligibility['program_name'] ?? 'N/A',
                'program_id' => $studentProgramId,
                'reason' => $eligibility['reason']
            ];
            
            $detailedResults[] = $detailedResult;
            
            // Update student record based on decision
            if ($decision === 'graduate') {
                // Update student status to graduated
                $updateQuery = "UPDATE student SET status = 'graduated', decission = 'completed' WHERE sid = ?";
                $updateStmt = mysqli_prepare($conn, $updateQuery);
                if ($updateStmt) {
                    mysqli_stmt_bind_param($updateStmt, "i", $sid);
                    $updateResult = mysqli_stmt_execute($updateStmt);
                    if (!$updateResult) {
                        error_log("DEBUG: Failed to update student graduation status for $sid");
                    }
                }
            } else {
                // Update student class for next year (promote or repeat)
                $updateQuery = "UPDATE student SET class = ?, program_id = ?, status = 'active' WHERE sid = ?";
                $updateStmt = mysqli_prepare($conn, $updateQuery);
                if ($updateStmt) {
                    mysqli_stmt_bind_param($updateStmt, "iii", $nextClassId, $studentProgramId, $sid);
                    $updateResult = mysqli_stmt_execute($updateStmt);
                    if (!$updateResult) {
                        error_log("DEBUG: Failed to update student class and program for $sid");
                    }
                }
            }
            
            // Commit transaction
            mysqli_commit($conn);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            mysqli_rollback($conn);
            $errorMsg = "Error processing student {$student['firstname']} {$student['lastname']}: " . $e->getMessage();
            $errors[] = $errorMsg;
            error_log("DEBUG: Student processing error: " . $e->getMessage());
            
            $detailedResults[] = [
                'sid' => $sid,
                'name' => $student['firstname'] . ' ' . $student['lastname'],
                'current_class_name' => $currentClassName,
                'next_class_name' => 'ERROR',
                'decision' => 'error',
                'average' => $averageScore ?? 0,
                'yearl_pass' => 'N/A',
                'program' => $eligibility['program_name'] ?? 'N/A',
                'error' => $e->getMessage()
            ];
        }
    }
    
    error_log("DEBUG: Migration completed - Students processed: $studentsProcessed, Promoted: $promoted, Repeated: $repeated, Graduated: $graduated");
    
    $result = [
        'promoted' => $promoted,
        'repeated' => $repeated,
        'graduated' => $graduated,
        'total' => $promoted + $repeated + $graduated,
        'next_year' => $nextYearRange,
        'detailed_results' => $detailedResults,
        'debug_info' => [
            'total_students' => $totalStudents,
            'students_processed' => $studentsProcessed
        ]
    ];
    
    if (!empty($errors)) {
        $result['errors'] = $errors;
    }
    
    return $result;
}

// UPGRADED Function to get student promotion history with proper level display
function getStudentPromotionHistory($conn, $sid) {
    $tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'student_promotion_log'");
    if (mysqli_num_rows($tableCheck) === 0) {
        return false;
    }
    
    $query = "SELECT sph.*, s.firstname, s.lastname, s.trade, p.program_name
              FROM student_promotion_log sph
              JOIN student s ON sph.sid = s.sid
              LEFT JOIN programs p ON sph.program_id = p.program_id
              WHERE sph.sid = ?
              ORDER BY sph.processed_at DESC";
    $stmt = mysqli_prepare($conn, $query);
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "i", $sid);
        mysqli_stmt_execute($stmt);
        return mysqli_stmt_get_result($stmt);
    }
    return false;
}

// ENHANCED Function to get academic history with program information
function getStudentAcademicHistory($conn, $sid) {
    $tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'student_academic_history'");
    if (mysqli_num_rows($tableCheck) === 0) {
        return false;
    }
    
    $query = "SELECT sah.*, p.program_name
              FROM student_academic_history sah
              LEFT JOIN programs p ON sah.program_id = p.program_id
              WHERE sah.sid = ?
              ORDER BY sah.academic_year DESC, sah.created_at DESC";
    $stmt = mysqli_prepare($conn, $query);
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, "i", $sid);
        mysqli_stmt_execute($stmt);
        return mysqli_stmt_get_result($stmt);
    }
    return false;
}

// ENHANCED Function to get migration statistics with program breakdown
function getMigrationStatistics($conn, $yearRange) {
    $tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'student_academic_history'");
    if (mysqli_num_rows($tableCheck) === 0) {
        return [
            'total_students' => 0,
            'promoted' => 0,
            'repeated' => 0,
            'graduated' => 0,
            'average_score' => 0,
            'program_breakdown' => []
        ];
    }
    
    // Get overall statistics
    $query = "SELECT 
                COUNT(*) as total_students,
                SUM(CASE WHEN decision = 'promote' THEN 1 ELSE 0 END) as promoted,
                SUM(CASE WHEN decision = 'repeat' THEN 1 ELSE 0 END) as repeated,
                SUM(CASE WHEN decision = 'graduate' THEN 1 ELSE 0 END) as graduated,
                AVG(average) as average_score
              FROM student_academic_history 
              WHERE academic_year = ?";
    $stmt = mysqli_prepare($conn, $query);
    if (!$stmt) {
        return [
            'total_students' => 0,
            'promoted' => 0,
            'repeated' => 0,
            'graduated' => 0,
            'average_score' => 0,
            'program_breakdown' => []
        ];
    }
    
    mysqli_stmt_bind_param($stmt, "s", $yearRange);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $stats = mysqli_fetch_assoc($result);
    
    // Get program breakdown
    $programQuery = "SELECT p.program_name, 
                            COUNT(*) as total,
                            SUM(CASE WHEN sah.decision = 'promote' THEN 1 ELSE 0 END) as promoted,
                            SUM(CASE WHEN sah.decision = 'repeat' THEN 1 ELSE 0 END) as repeated,
                            SUM(CASE WHEN sah.decision = 'graduate' THEN 1 ELSE 0 END) as graduated,
                            AVG(sah.average) as average_score
                     FROM student_academic_history sah
                     LEFT JOIN programs p ON sah.program_id = p.program_id
                     WHERE sah.academic_year = ?
                     GROUP BY p.program_name
                     ORDER BY total DESC";
    $programStmt = mysqli_prepare($conn, $programQuery);
    $programBreakdown = [];
    
    if ($programStmt) {
        mysqli_stmt_bind_param($programStmt, "s", $yearRange);
        mysqli_stmt_execute($programStmt);
        $programResult = mysqli_stmt_get_result($programStmt);
        
        while ($program = mysqli_fetch_assoc($programResult)) {
            $programBreakdown[] = $program;
        }
    }
    
    $finalStats = $stats ?: [
        'total_students' => 0,
        'promoted' => 0,
        'repeated' => 0,
        'graduated' => 0,
        'average_score' => 0
    ];
    
    $finalStats['program_breakdown'] = $programBreakdown;
    
    return $finalStats;
}

// ENHANCED Function to get system overview with program information
function getSystemOverview($conn) {
    $overview = [];
    
    // Total students
    $result = mysqli_query($conn, "SELECT COUNT(*) as total FROM student WHERE status = 'active'");
    $overview['total_students'] = $result ? mysqli_fetch_assoc($result)['total'] : 0;
    
    // Total teachers
    $result = mysqli_query($conn, "SELECT COUNT(*) as total FROM teacher");
    $overview['total_teachers'] = $result ? mysqli_fetch_assoc($result)['total'] : 0;
    
    // Total programs
    $result = mysqli_query($conn, "SELECT COUNT(*) as total FROM programs");
    $overview['total_programs'] = $result ? mysqli_fetch_assoc($result)['total'] : 0;
    
    // Current academic year
    $result = mysqli_query($conn, "SELECT year FROM year WHERE status = 'active' ORDER BY year_id DESC LIMIT 1");
    $overview['current_year'] = $result ? (mysqli_fetch_assoc($result)['year'] ?? 'Not set') : 'Not set';
    
    // Recent migrations
    $tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'student_promotion_log'");
    if (mysqli_num_rows($tableCheck) > 0) {
        $result = mysqli_query($conn, "SELECT COUNT(DISTINCT from_year) as recent_migrations FROM student_promotion_log WHERE processed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
        $overview['recent_migrations'] = $result ? mysqli_fetch_assoc($result)['recent_migrations'] : 0;
    } else {
        $overview['recent_migrations'] = 0;
    }
    
    return $overview;
}

// Process form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    error_log("POST request detected");
    
    if (isset($_POST['promote_students'])) {
        error_log("PROMOTE STUDENTS BUTTON CLICKED");
        
        // Create required tables first
        $createdTables = createRequiredTables($conn);
        
        if (isset($_POST['year']) && !empty($_POST['year'])) {
            $selectedYearRange = $_POST['year'];
            $processedBy = $_SESSION['id'];
            
            error_log("Starting migration for year: $selectedYearRange");
            
            $result = promoteStudentsWithHistory($conn, $selectedYearRange, $processedBy);
            
            if (isset($result['error'])) {
                $errorMessage = $result['error'];
            } else {
                $successMessage = "Student migration completed successfully!<br>";
                $successMessage .= "✅ Promoted: {$result['promoted']} students<br>";
                $successMessage .= "🔄 Repeated: {$result['repeated']} students<br>";
                $successMessage .= "🎓 Graduated: {$result['graduated']} students<br>";
                $successMessage .= "📊 Total processed: {$result['total']} students<br>";
                $successMessage .= "📅 Next academic year: {$result['next_year']}";
                
                if (!empty($createdTables)) {
                    $successMessage .= "<br>📝 Created/Updated tables: " . implode(', ', $createdTables);
                }
                
                // Add debug info to success message
                if (isset($result['debug_info'])) {
                    $successMessage .= "<br><strong>Debug Info:</strong><br>";
                    $successMessage .= "Total Active Students: {$result['debug_info']['total_students']}<br>";
                    $successMessage .= "Students Processed: {$result['debug_info']['students_processed']}";
                }
                
                if (isset($result['errors']) && !empty($result['errors'])) {
                    $errorDetails = $result['errors'];
                }
                
                $detailedResults = $result['detailed_results'] ?? [];
            }
        } else {
            $errorMessage = "Please select an academic year";
        }
    }
    
    // View student history
    if (isset($_POST['view_history'])) {
        error_log("View history button clicked");
        $studentId = (int)$_POST['student_id'];
        $historyResult = getStudentPromotionHistory($conn, $studentId);
        $academicHistoryResult = getStudentAcademicHistory($conn, $studentId);
    }
    
    // View migration statistics
    if (isset($_POST['view_stats'])) {
        error_log("View stats button clicked");
        $statsYear = $_POST['stats_year'];
        $migrationStats = getMigrationStatistics($conn, $statsYear);
    }
}

// Get available academic years
$academicYears = getAcademicYears($conn);
$systemOverview = getSystemOverview($conn);

// Create tables on page load to ensure they exist
$createdTablesOnLoad = createRequiredTables($conn);

// Debug: Check if tables have data
$academicHistoryCount = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as count FROM student_academic_history"))['count'];
$classLevelsCount = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as count FROM class_levels"))['count'];
$promotionLogCount = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as count FROM student_promotion_log"))['count'];
$programsCount = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(*) as count FROM programs"))['count'];

error_log("Page load completed");
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced TVET Student Migration System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 {
            text-align: center;
            color: #2c3e50;
            margin-bottom: 30px;
            font-size: 2.5rem;
        }
        
        h2, h3, h4 {
            color: #2c3e50;
            margin-bottom: 15px;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            font-weight: 500;
        }
        
        .alert-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert-danger {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert-info {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        
        .tabs {
            display: flex;
            background-color: #fff;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .tab {
            padding: 15px 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            flex: 1;
            font-weight: 600;
        }
        
        .tab:hover {
            background-color: #f8f9fa;
        }
        
        .tab.active {
            background-color: #3498db;
            color: white;
        }
        
        .tab-content {
            display: none;
            background-color: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }
        
        select, input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border 0.3s;
        }
        
        select:focus, input:focus {
            border-color: #3498db;
            outline: none;
            box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        
        button {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: background-color 0.3s;
        }
        
        button:hover {
            background-color: #2980b9;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }
        
        tr:hover {
            background-color: #f8f9fa;
        }
        
        .overview-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .overview-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .overview-card h3 {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .overview-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-label {
            font-size: 14px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        
        .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .results-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .result-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #3498db;
        }
        
        .result-card.promote {
            border-left-color: #28a745;
        }
        
        .result-card.repeat {
            border-left-color: #ffc107;
        }
        
        .result-card.graduate {
            border-left-color: #6f42c1;
        }
        
        .student-name {
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        
        .student-details {
            font-size: 14px;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .progress-bar {
            width: 100%;
            height: 10px;
            background: #e9ecef;
            border-radius: 5px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress {
            height: 100%;
            background: #3498db;
            width: 0%;
            transition: width 0.3s;
        }
        
        .debug-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .table-status {
            margin-bottom: 5px;
        }
        
        .success-badge {
            background-color: #28a745;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: inline-block;
        }
        
        .error-badge {
            background-color: #dc3545;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: inline-block;
        }
        
        .class-progression {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .progression-path {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 15px 0;
        }
        
        .level {
            background: #3498db;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
        }
        
        .arrow {
            margin: 0 15px;
            font-size: 1.5rem;
            color: #7f8c8d;
        }
        
        .repeat-box {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        
        .instructions {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .simplified-criteria {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        
        .program-badge {
            background-color: #6f42c1;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: inline-block;
            margin: 2px;
        }
        
        .program-breakdown {
            margin-top: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
        }
        
        .program-item {
            display: flex;
            justify-content: space-between;
            padding: 8px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .program-item:last-child {
            border-bottom: none;
        }
        
        .level-badge {
            background-color: #3498db;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            display: inline-block;
            margin: 2px;
        }
        
        .level-change {
            font-weight: bold;
            color: #2c3e50;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            h1 {
                font-size: 1.8rem;
            }
            
            .tabs {
                flex-wrap: wrap;
            }
            
            .tab {
                flex: 1;
                min-width: 120px;
                text-align: center;
            }
            
            .overview-cards {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .program-item {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 TVET Student Migration System</h1>
        
        <?php if (!empty($createdTablesOnLoad)): ?>
            <div class="alert alert-info">
                <strong>System Ready:</strong> Tables created/updated: <?php echo implode(', ', $createdTablesOnLoad); ?>
            </div>
        <?php endif; ?>
        
        <!-- Debug Information -->
        <div class="debug-info">
            <strong>Database Status:</strong><br>
            <div class="table-status">
                <strong>student_academic_history:</strong>
                <?php if ($academicHistoryCount > 0): ?>
                    <span class="success-badge"><?php echo $academicHistoryCount; ?> records</span>
                <?php else: ?>
                    <span class="error-badge">Empty</span>
                <?php endif; ?>
            </div>
            
            <div class="table-status">
                <strong>class_levels:</strong>
                <?php if ($classLevelsCount > 0): ?>
                    <span class="success-badge"><?php echo $classLevelsCount; ?> records</span>
                <?php else: ?>
                    <span class="error-badge">Empty</span>
                <?php endif; ?>
            </div>
            
            <div class="table-status">
                <strong>programs:</strong>
                <?php if ($programsCount > 0): ?>
                    <span class="success-badge"><?php echo $programsCount; ?> programs</span>
                <?php else: ?>
                    <span class="error-badge">Empty</span>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Class Progression Guide -->
        <div class="class-progression">
            <h3>📈 Class Progression Path (Level-Based)</h3>
            <div class="progression-path">
                <div class="level">L3</div>
                <div class="arrow">→</div>
                <div class="level">L4</div>
                <div class="arrow">→</div>
                <div class="level">L5 🎓</div>
            </div>
            <div class="repeat-box">
                <strong>Promotion Rule:</strong><br>
                ✅ yearl_pass ≥ 60% → Move to next level in next academic year<br>
                ❌ yearl_pass &lt; 60% → Repeat same level in next academic year<br>
                🎓 Final level (L5) with yearl_pass ≥ 60% → Graduate
            </div>
            <p><strong>Migration Logic:</strong> All students move to next academic year. Level changes depend on eligibility criteria.</p>
            <p><strong>Level Tracking:</strong> Promotion log stores level codes (L3, L4, L5) for accurate progression tracking.</p>
        </div>
        
        <!-- System Overview -->
        <div class="overview-cards">
            <div class="overview-card">
                <h3>Total Students</h3>
                <div class="number"><?php echo $systemOverview['total_students']; ?></div>
            </div>
            <div class="overview-card">
                <h3>Total Teachers</h3>
                <div class="number"><?php echo $systemOverview['total_teachers']; ?></div>
            </div>
            <div class="overview-card">
                <h3>Total Programs</h3>
                <div class="number"><?php echo $systemOverview['total_programs']; ?></div>
            </div>
            <div class="overview-card">
                <h3>Current Academic Year</h3>
                <div class="number" style="font-size: 1.2em;"><?php echo $systemOverview['current_year']; ?></div>
            </div>
            <div class="overview-card">
                <h3>Recent Migrations</h3>
                <div class="number"><?php echo $systemOverview['recent_migrations']; ?></div>
            </div>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="switchTab('migration')">📊 Student Migration</div>
            <div class="tab" onclick="switchTab('history')">📋 Student History</div>
            <div class="tab" onclick="switchTab('academic_history')">🎓 Academic History</div>
            <div class="tab" onclick="switchTab('statistics')">📈 Statistics</div>
            <div class="tab" onclick="switchTab('results')">🔍 Detailed Results</div>
        </div>
        
        <!-- Migration Tab -->
        <div id="migration" class="tab-content active">
            <div class="instructions">
                <h3>🚀 Level-Based Migration Process</h3>
                <div class="simplified-criteria">
                    <h4>🎯 Promotion Criteria (Based on yearl_pass and Level)</h4>
                    <p><strong>All Students:</strong> Move to next academic year automatically</p>
                    <p><strong>Level Change:</strong> 
                        <span class="level-badge">yearl_pass ≥ 60%</span> → Move to next level | 
                        <span class="level-badge">yearl_pass &lt; 60%</span> → Repeat same level
                    </p>
                    <p><strong>Graduation:</strong> 
                        <span class="level-badge">Final level (L5)</span> + 
                        <span class="level-badge">yearl_pass ≥ 60%</span> → Graduate
                    </p>
                </div>
                <p><strong>Data Source:</strong> Uses <code>yearl_pass</code> field from <code>ranks</code> table</p>
                <p><strong>Level Tracking:</strong> Uses <code>class.level</code> field to determine actual level progression</p>
            </div>
            
            <?php if (isset($successMessage)): ?>
                <div class="alert alert-success">
                    <?php echo $successMessage; ?>
                </div>
            <?php elseif (isset($errorMessage)): ?>
                <div class="alert alert-danger">
                    <strong>❌ Error:</strong> <?php echo $errorMessage; ?>
                </div>
            <?php endif; ?>
            
            <?php if (isset($errorDetails)): ?>
                <div class="alert alert-danger">
                    <strong>⚠️ Processing Errors:</strong>
                    <ul>
                        <?php foreach ($errorDetails as $detail): ?>
                            <li><?php echo $detail; ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label for="year">🎯 Select Academic Year to Migrate From:</label>
                    <select name="year" id="year" required>
                        <option value="">-- Select Academic Year --</option>
                        <?php foreach ($academicYears as $year): ?>
                            <option value="<?php echo htmlspecialchars($year['year']); ?>" 
                                <?php echo (isset($_POST['year']) && $_POST['year'] == $year['year']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($year['year']); ?> 
                                (<?php echo $year['status']; ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <button type="submit" name="promote_students" onclick="return showLoading()">
                    🚀 Execute Student Migration
                </button>
            </form>
            
            <div id="loading" class="loading">
                <div style="font-size: 18px; color: #3498db; margin-bottom: 10px;">
                    ⏳ Processing migration... This may take a few minutes.
                </div>
                <div class="progress-bar">
                    <div id="progress" class="progress"></div>
                </div>
                <p>Please wait while students are being processed...</p>
            </div>
        </div>
        
        <!-- Student History Tab -->
        <div id="history" class="tab-content">
            <h3>📋 Student Promotion History</h3>
            <form method="POST" action="">
                <div class="form-group">
                    <label for="student_id">Enter Student ID:</label>
                    <input type="number" name="student_id" id="student_id" required 
                           value="<?php echo isset($_POST['student_id']) ? $_POST['student_id'] : ''; ?>"
                           placeholder="e.g., 12345">
                </div>
                <button type="submit" name="view_history">🔍 View History</button>
            </form>
            
            <?php if (isset($historyResult) && $historyResult): ?>
                <?php if (mysqli_num_rows($historyResult) > 0): ?>
                    <table>
                        <thead>
                            <tr>
                                <th>Year From</th>
                                <th>Year To</th>
                                <th>From Level</th>
                                <th>To Level</th>
                                <th>Program</th>
                                <th>Decision</th>
                                <th>Average</th>
                                <th>Processed At</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($history = mysqli_fetch_assoc($historyResult)): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($history['from_year']); ?></td>
                                    <td><?php echo htmlspecialchars($history['to_year']); ?></td>
                                    <td>
                                        <span class="level-badge"><?php echo htmlspecialchars($history['from_level']); ?></span>
                                    </td>
                                    <td>
                                        <?php if ($history['to_level'] !== 'GRADUATED'): ?>
                                            <span class="level-badge"><?php echo htmlspecialchars($history['to_level']); ?></span>
                                        <?php else: ?>
                                            <span class="success-badge">GRADUATED</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php if (!empty($history['program_name'])): ?>
                                            <span class="program-badge"><?php echo htmlspecialchars($history['program_name']); ?></span>
                                        <?php else: ?>
                                            <span class="error-badge">No Program</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php 
                                        $decision = $history['decision'];
                                        $badgeClass = $decision == 'promoted' ? 'success-badge' : 
                                                     ($decision == 'repeated' ? 'error-badge' : 
                                                     ($decision == 'graduated' ? 'success-badge' : 'success-badge'));
                                        ?>
                                        <span class="<?php echo $badgeClass; ?>"><?php echo ucfirst($decision); ?></span>
                                    </td>
                                    <td><?php echo number_format($history['average_mark'], 2); ?>%</td>
                                    <td><?php echo date('M j, Y g:i A', strtotime($history['processed_at'])); ?></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="alert alert-info">
                        No promotion history found for this student.
                    </div>
                <?php endif; ?>
            <?php elseif (isset($historyResult) && !$historyResult): ?>
                <div class="alert alert-danger">
                    Promotion history table does not exist.
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Academic History Tab -->
        <div id="academic_history" class="tab-content">
            <h3>🎓 Student Academic History</h3>
            <?php if (isset($academicHistoryResult) && $academicHistoryResult): ?>
                <?php if (mysqli_num_rows($academicHistoryResult) > 0): ?>
                    <table>
                        <thead>
                            <tr>
                                <th>Academic Year</th>
                                <th>Class Level</th>
                                <th>Program</th>
                                <th>Status</th>
                                <th>Average</th>
                                <th>Decision</th>
                                <th>Recorded At</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($academic = mysqli_fetch_assoc($academicHistoryResult)): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($academic['academic_year']); ?></td>
                                    <td>
                                        <span class="level-badge"><?php echo htmlspecialchars($academic['class_level']); ?></span>
                                    </td>
                                    <td>
                                        <?php if (!empty($academic['program_name'])): ?>
                                            <span class="program-badge"><?php echo htmlspecialchars($academic['program_name']); ?></span>
                                        <?php else: ?>
                                            <span class="error-badge">No Program</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php 
                                        $status = $academic['status'];
                                        $badgeClass = ($status == 'promoted' || $status == 'graduated') ? 'success-badge' : 
                                                     ($status == 'repeated' ? 'error-badge' : 'success-badge');
                                        ?>
                                        <span class="<?php echo $badgeClass; ?>"><?php echo ucfirst($status); ?></span>
                                    </td>
                                    <td><?php echo number_format($academic['average'], 2); ?>%</td>
                                    <td><?php echo ucfirst($academic['decision']); ?></td>
                                    <td><?php echo date('M j, Y g:i A', strtotime($academic['created_at'])); ?></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="alert alert-info">
                        No academic history found for this student.
                    </div>
                <?php endif; ?>
            <?php elseif (isset($academicHistoryResult) && !$academicHistoryResult): ?>
                <div class="alert alert-danger">
                    Academic history table does not exist.
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Statistics Tab -->
        <div id="statistics" class="tab-content">
            <h3>📈 Migration Statistics</h3>
            <form method="POST" action="">
                <div class="form-group">
                    <label for="stats_year">Select Academic Year:</label>
                    <select name="stats_year" id="stats_year" required>
                        <option value="">-- Select Academic Year --</option>
                        <?php foreach ($academicYears as $year): ?>
                            <option value="<?php echo htmlspecialchars($year['year']); ?>"
                                <?php echo (isset($_POST['stats_year']) && $_POST['stats_year'] == $year['year']) ? 'selected' : ''; ?>>
                                <?php echo htmlspecialchars($year['year']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <button type="submit" name="view_stats">📊 View Statistics</button>
            </form>
            
            <?php if (isset($migrationStats)): ?>
                <div class="stats-grid" style="margin-top: 20px;">
                    <div class="stat-card">
                        <div class="stat-label">Total Students</div>
                        <div class="stat-number"><?php echo $migrationStats['total_students']; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Promoted</div>
                        <div class="stat-number" style="color: #28a745;"><?php echo $migrationStats['promoted']; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Repeated</div>
                        <div class="stat-number" style="color: #ffc107;"><?php echo $migrationStats['repeated']; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Graduated</div>
                        <div class="stat-number" style="color: #6f42c1;"><?php echo $migrationStats['graduated']; ?></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Average Score</div>
                        <div class="stat-number"><?php echo number_format($migrationStats['average_score'], 2); ?>%</div>
                    </div>
                </div>
                
                <?php if (!empty($migrationStats['program_breakdown'])): ?>
                    <div class="program-breakdown">
                        <h4>Program Breakdown</h4>
                        <?php foreach ($migrationStats['program_breakdown'] as $program): ?>
                            <div class="program-item">
                                <div>
                                    <strong><?php 
                                    
                                    echo htmlspecialchars($program['program_name'] ?: 'No Program'); ?></strong>
                                </div>
                                <div>
                                    Total: <?php echo $program['total']; ?> | 
                                    Promoted: <span style="color: #28a745;"><?php echo $program['promoted']; ?></span> | 
                                    Repeated: <span style="color: #ffc107;"><?php echo $program['repeated']; ?></span> | 
                                    Graduated: <span style="color: #6f42c1;"><?php echo $program['graduated']; ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
        
        <!-- Detailed Results Tab -->
        <div id="results" class="tab-content">
            <h3>🔍 Detailed Migration Results</h3>
            
            <?php if (isset($detailedResults) && !empty($detailedResults)): ?>
                <div class="results-grid">
                    <?php foreach ($detailedResults as $result): ?>
                        <div class="result-card <?php echo $result['decision']; ?>">
                            <div class="student-name">
                                <?php echo htmlspecialchars($result['name']); ?> (ID: <?php echo $result['sid']; ?>)
                            </div>
                            <div class="student-details">
                                <strong>From:</strong> 
                                <span class="level-badge"><?php echo htmlspecialchars($result['current_class_name']); ?></span>
                                (Level: <?php echo htmlspecialchars($result['current_level']); ?>)<br>
                                <strong>To:</strong> 
                                <?php if ($result['next_class_name'] !== 'GRADUATED'): ?>
                                    <span class="level-badge"><?php echo htmlspecialchars($result['next_class_name']); ?></span>
                                    (Level: <?php echo htmlspecialchars($result['next_level']); ?>)
                                <?php else: ?>
                                    <span class="success-badge">GRADUATED</span>
                                <?php endif; ?>
                                <br>
                                <strong>Level Change:</strong> 
                                <span class="level-change">
                                    <?php echo htmlspecialchars($result['current_level']); ?> → 
                                    <?php echo htmlspecialchars($result['next_level'] ?? 'GRADUATED'); ?>
                                </span><br>
                                <strong>Program:</strong> 
                                <?php if (!empty($result['program'])): ?>
                                    <span class="program-badge"><?php echo htmlspecialchars($result['program']); ?></span>
                                <?php else: ?>
                                    <span class="error-badge">No Program</span>
                                <?php endif; ?>
                                <br>
                                <strong>Decision:</strong> 
                                <?php 
                                $decision = $result['decision'];
                                $badgeClass = $decision == 'promote' ? 'success-badge' : 
                                             ($decision == 'repeat' ? 'error-badge' : 'success-badge');
                                ?>
                                <span class="<?php echo $badgeClass; ?>"><?php echo ucfirst($decision); ?></span><br>
                                <strong>Yearly Pass:</strong> <?php echo $result['yearl_pass']; ?>%<br>
                                <strong>Average:</strong> <?php echo number_format($result['average'], 2); ?>%<br>
                                <strong>Eligible:</strong> <?php echo $result['is_eligible'] ? '✅ Yes' : '❌ No'; ?><br>
                                <strong>Reason:</strong> <?php echo htmlspecialchars($result['reason']); ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <div class="alert alert-info">
                    No migration results to display. Run a migration first to see detailed results.
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        function switchTab(tabName) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all tabs
            const tabs = document.querySelectorAll('.tab');
            tabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.currentTarget.classList.add('active');
        }
        
        function showLoading() {
            const year = document.getElementById('year').value;
            if (!year) {
                alert('Please select an academic year first.');
                return false;
            }
            
            const confirmation = confirm(`Are you sure you want to execute student migration for academic year ${year}?\n\nThis action cannot be undone.`);
            
            if (confirmation) {
                // Show loading indicator
                document.getElementById('loading').style.display = 'block';
                
                // Simulate progress bar
                let progress = 0;
                const progressBar = document.getElementById('progress');
                const interval = setInterval(() => {
                    progress += 5;
                    progressBar.style.width = progress + '%';
                    
                    if (progress >= 90) {
                        clearInterval(interval);
                    }
                }, 200);
                
                return true;
            }
            
            return false;
        }

        // Auto-switch to results tab if there are results
        <?php if (isset($detailedResults) && !empty($detailedResults)): ?>
            document.addEventListener('DOMContentLoaded', function() {
                switchTab('results');
            });
        <?php endif; ?>
    </script>
</body>
</html>
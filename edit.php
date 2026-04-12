<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start();
include("connection.php");
session_start();

// Verify teacher is logged in
if (!isset($_SESSION['tid'])) {
    header("location:index.html");
    exit();
}

// Verify all required session variables
$required_vars = ['tid', 'cl', 'module', 'year', 'tearm'];
foreach ($required_vars as $var) {
    if (!isset($_SESSION[$var])) {
        die("Missing required session variable: $var");
    }
}

$me = $_SESSION['tid'];
$class = $_SESSION['cl'];
$module = $_SESSION['module'];
$year = $_SESSION['year'];
$term = $_SESSION['tearm'];

// Get class and module info
$info_query = mysqli_query($conn, "SELECT c.level, c.class_name, m.mname, m.credit 
                                  FROM class c, module m 
                                  WHERE m.moid='$module' AND c.cid='$class'");
$info = mysqli_fetch_assoc($info_query);
$module_credit = $info['credit'] ?? 0;
$default_total = $module_credit * 10; // Default total marks based on credit

// Get all active students in this class for the current year
$students_query = "
    SELECT s.sid, s.firstname, s.lastname
    FROM student s
    INNER JOIN student_promotion_log spl ON s.sid = spl.sid
    WHERE spl.to_class = '$class'
    AND spl.to_year = '$year'
    AND s.status = 'Active'
    ORDER BY s.firstname ASC";

$students_result = mysqli_query($conn, $students_query);

if (!$students_result) {
    die("Error fetching students: " . mysqli_error($conn));
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Marks - <?php echo htmlspecialchars($info['mname'] ?? ''); ?></title>
    <style>
    body {
        font-family: sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f4f4f4;
        min-height: 100vh;
        box-sizing: border-box;
    }

    .cont {
        background-color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        width: 95%;
        max-width: 1000px;
        margin: 0 auto;
    }

    .header-info {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
    }

    .header-info h2 {
        margin: 0;
        font-size: 1.3rem;
    }

    .header-info .badge {
        background: rgba(255,255,255,0.2);
        padding: 5px 10px;
        border-radius: 20px;
        font-size: 0.9rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    th,
    td {
        border: 1px solid #ddd;
        padding: 12px 8px;
        text-align: center;
    }

    th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: bold;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    tr:nth-child(even) {
        background-color: #f8f9fa;
    }

    tr:hover {
        background-color: #f1f1f1;
    }

    input[type="number"] {
        width: 80px;
        padding: 8px;
        border: 2px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
        text-align: center;
        font-size: 14px;
        transition: all 0.3s ease;
    }

    input[type="number"]:focus {
        border-color: #667eea;
        outline: none;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    input[type="number"].modified {
        border-color: #ffc107;
        background-color: #fff3cd;
    }

    input[type="number"].saved {
        border-color: #28a745;
        background-color: #d4edda;
    }

    input[type="number"].error {
        border-color: #dc3545;
        background-color: #f8d7da;
    }

    .total-field {
        background-color: #f0f0f0;
        font-weight: bold;
    }

    #notification-bar {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 350px;
        pointer-events: none;
    }

    .controls {
        margin-bottom: 20px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
    }

    .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s ease;
        font-size: 14px;
    }

    .btn-secondary {
        background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        color: white;
    }

    .btn-secondary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
    }

    .btn-success {
        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
        color: white;
    }

    .btn-success:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
    }

    .btn-warning {
        background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
        color: #212529;
    }

    .btn-warning:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4);
    }

    .stats-bar {
        background: #e9ecef;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 14px;
        color: #495057;
    }

    .stats-bar span {
        font-weight: bold;
        color: #667eea;
    }

    .loading-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 5px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .cont {
            padding: 10px;
            width: 100%;
        }

        table {
            font-size: 14px;
        }

        th, td {
            padding: 8px 4px;
        }

        input[type="number"] {
            width: 60px;
            padding: 6px;
        }

        .controls {
            flex-direction: column;
        }

        .btn {
            width: 100%;
        }

        #notification-bar {
            left: 20px;
            right: 20px;
            max-width: none;
        }
    }
    </style>
</head>

<body>
    <div id="notification-bar"></div>
    <div class="cont">
        <div class="header-info">
            <h2>
                <i class="fas fa-chalkboard-teacher"></i> 
                <?php echo htmlspecialchars($info['level'] ?? '') . ' - ' . htmlspecialchars($info['class_name'] ?? ''); ?>
            </h2>
            <h2>
                <i class="fas fa-book"></i> 
                <?php echo htmlspecialchars($info['mname'] ?? ''); ?>
            </h2>
            <div>
                <span class="badge">Term <?php echo htmlspecialchars($term); ?></span>
                <span class="badge">Default Total: <?php echo $default_total; ?></span>
            </div>
        </div>

        <div class="controls">
            <div>
                <button class="btn btn-secondary" onclick="window.location.href='list.php'">
                    <i class="fas fa-arrow-left"></i> Back to List
                </button>
                <button class="btn btn-warning" onclick="resetToDefaultTotals()" style="margin-left: 10px;">
                    <i class="fas fa-undo"></i> Reset Totals
                </button>
            </div>
            <div class="stats-bar" id="statsBar">
                <span id="studentCount">0</span> Students | 
                <span id="savedCount">0</span> Saved | 
                <span id="modifiedCount">0</span> Modified
            </div>
            <div>
                <button class="btn btn-success" onclick="saveAllMarks()">
                    <i class="fas fa-save"></i> Save All Changes
                </button>
            </div>
        </div>

        <form id="marksForm">
            <table>
                <thead>
                    <tr>
                        <th colspan="6"><?php echo "Term " . htmlspecialchars($term) . " - " . htmlspecialchars($info['mname'] ?? ''); ?></th>
                    </tr>
                    <tr>
                        <th>No</th>
                        <th>Student Name</th>
                        <th>Test</th>
                        <th>Test Total</th>
                        <th>Exam</th>
                        <th>Exam Total</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $no = 0;
                    $total_students = mysqli_num_rows($students_result);
                    
                    while ($student = mysqli_fetch_assoc($students_result)) {
                        $no++;
                        $sid = $student['sid'];
                        
                        // Check if marks exist for this student
                        $marks_query = "SELECT * FROM marks 
                                       WHERE sid='$sid' 
                                       AND mid='$module' 
                                       AND tid='$me' 
                                       AND cid='$class' 
                                       AND team='$term' 
                                       AND year='$year'";
                        $marks_result = mysqli_query($conn, $marks_query);
                        $has_marks = mysqli_num_rows($marks_result) > 0;
                        $marks_data = $has_marks ? mysqli_fetch_assoc($marks_result) : null;
                        
                        $mark_id = $marks_data['mark_id'] ?? '';
                        $test_value = $marks_data['test'] ?? '';
                        $ttotal_value = $marks_data['ttotal'] ?? $default_total;
                        $exam_value = $marks_data['exam'] ?? '';
                        $etotal_value = $marks_data['etotal'] ?? $default_total;
                        
                        // Determine row class
                        $row_class = !$has_marks ? 'new-student' : '';
                    ?>
                    <tr class="<?php echo $row_class; ?>" data-sid="<?php echo $sid; ?>" data-mark-id="<?php echo $mark_id; ?>">
                        <td><?php echo $no; ?></td>
                        <td><?php echo htmlspecialchars($student['firstname'] . " " . $student['lastname']); ?></td>
                        <td>
                            <input type="number" 
                                   name="test_<?php echo $sid; ?>"
                                   value="<?php echo htmlspecialchars($test_value); ?>" 
                                   class="mark-input"
                                   data-sid="<?php echo $sid; ?>" 
                                   data-field="test" 
                                   data-mark-id="<?php echo $mark_id; ?>" 
                                   data-total-field="ttotal_<?php echo $sid; ?>"
                                   min="0" 
                                   max="999" 
                                   step="0.5"
                                   placeholder="-">
                        </td>
                        <td>
                            <input type="number" 
                                   name="ttotal_<?php echo $sid; ?>"
                                   value="<?php echo htmlspecialchars($ttotal_value); ?>" 
                                   class="mark-input total-field"
                                   data-sid="<?php echo $sid; ?>" 
                                   data-field="ttotal" 
                                   data-mark-id="<?php echo $mark_id; ?>" 
                                   data-related-field="test_<?php echo $sid; ?>"
                                   min="0" 
                                   max="999" 
                                   step="0.5"
                                   placeholder="Total">
                        </td>
                        <td>
                            <input type="number" 
                                   name="exam_<?php echo $sid; ?>"
                                   value="<?php echo htmlspecialchars($exam_value); ?>" 
                                   class="mark-input"
                                   data-sid="<?php echo $sid; ?>" 
                                   data-field="exam" 
                                   data-mark-id="<?php echo $mark_id; ?>" 
                                   data-total-field="etotal_<?php echo $sid; ?>"
                                   min="0" 
                                   max="999" 
                                   step="0.5"
                                   placeholder="-">
                        </td>
                        <td>
                            <input type="number" 
                                   name="etotal_<?php echo $sid; ?>"
                                   value="<?php echo htmlspecialchars($etotal_value); ?>" 
                                   class="mark-input total-field"
                                   data-sid="<?php echo $sid; ?>" 
                                   data-field="etotal" 
                                   data-mark-id="<?php echo $mark_id; ?>" 
                                   data-related-field="exam_<?php echo $sid; ?>"
                                   min="0" 
                                   max="999" 
                                   step="0.5"
                                   placeholder="Total">
                        </td>
                    </tr>
                    <?php
                    }
                    ?>
                </tbody>
            </table>
        </form>
    </div>

    <script>
    // Store initial values and track modifications
    const initialValues = new Map();
    const modifiedInputs = new Set();
    let saveInProgress = false;
    const defaultTotal = <?php echo $default_total; ?>;

    // Function to validate mark against total
    function validateMarkAgainstTotal(markInput, totalInput) {
        if (!totalInput) return true;
        
        const markValue = markInput.value === '' ? '' : parseFloat(markInput.value);
        const totalValue = totalInput.value === '' ? '' : parseFloat(totalInput.value);
        
        // If total is not set, use default total for validation
        const maxAllowed = (totalValue !== '' && !isNaN(totalValue)) ? totalValue : defaultTotal;
        
        if (markValue !== '' && !isNaN(markValue) && markValue > maxAllowed) {
            markInput.classList.add('error');
            showNotification(`Mark (${markValue}) cannot exceed total (${maxAllowed})`, '#dc3545');
            markInput.value = initialValues.get(markInput) || '';
            return false;
        }
        
        markInput.classList.remove('error');
        return true;
    }

    // Function to validate total against marks
    function validateTotalAgainstMark(totalInput, markInput) {
        if (!markInput) return true;
        
        const totalValue = totalInput.value === '' ? '' : parseFloat(totalInput.value);
        const markValue = markInput.value === '' ? '' : parseFloat(markInput.value);
        
        if (totalValue !== '' && !isNaN(totalValue) && markValue !== '' && !isNaN(markValue) && markValue > totalValue) {
            totalInput.classList.add('error');
            showNotification(`Total (${totalValue}) cannot be less than mark (${markValue})`, '#dc3545');
            totalInput.value = initialValues.get(totalInput) || defaultTotal;
            return false;
        }
        
        totalInput.classList.remove('error');
        return true;
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        const inputs = document.querySelectorAll('.mark-input');
        const studentCount = <?php echo $total_students; ?>;
        
        // Update stats
        document.getElementById('studentCount').textContent = studentCount;
        
        inputs.forEach(input => {
            // Store initial value
            initialValues.set(input, input.value);
            
            // Add event listeners for validation
            input.addEventListener('input', function() {
                const field = this.dataset.field;
                
                if (field === 'test') {
                    const totalInput = document.querySelector(`input[name="${this.dataset.totalField}"]`);
                    validateMarkAgainstTotal(this, totalInput);
                } else if (field === 'exam') {
                    const totalInput = document.querySelector(`input[name="${this.dataset.totalField}"]`);
                    validateMarkAgainstTotal(this, totalInput);
                } else if (field === 'ttotal') {
                    const markInput = document.querySelector(`input[name="${this.dataset.relatedField}"]`);
                    validateTotalAgainstMark(this, markInput);
                } else if (field === 'etotal') {
                    const markInput = document.querySelector(`input[name="${this.dataset.relatedField}"]`);
                    validateTotalAgainstMark(this, markInput);
                }
                
                // Mark as modified if value changed
                if (this.value !== initialValues.get(this)) {
                    markAsModified(this);
                } else {
                    // If value reverted to original, remove from modified
                    if (modifiedInputs.has(this)) {
                        modifiedInputs.delete(this);
                        this.classList.remove('modified');
                        updateStats();
                    }
                }
            });
            
            input.addEventListener('change', function() {
                // Validate again on change
                const field = this.dataset.field;
                let isValid = true;
                
                if (field === 'test') {
                    const totalInput = document.querySelector(`input[name="${this.dataset.totalField}"]`);
                    isValid = validateMarkAgainstTotal(this, totalInput);
                } else if (field === 'exam') {
                    const totalInput = document.querySelector(`input[name="${this.dataset.totalField}"]`);
                    isValid = validateMarkAgainstTotal(this, totalInput);
                } else if (field === 'ttotal') {
                    const markInput = document.querySelector(`input[name="${this.dataset.relatedField}"]`);
                    isValid = validateTotalAgainstMark(this, markInput);
                } else if (field === 'etotal') {
                    const markInput = document.querySelector(`input[name="${this.dataset.relatedField}"]`);
                    isValid = validateTotalAgainstMark(this, markInput);
                }
                
                // If valid and changed, save
                if (isValid && this.value !== initialValues.get(this)) {
                    saveMark(this);
                } else if (!isValid) {
                    // Reset to previous value if invalid
                    this.value = initialValues.get(this);
                }
            });
            
            input.addEventListener('blur', function() {
                if (this.value !== initialValues.get(this) && !this.classList.contains('error')) {
                    saveMark(this);
                }
            });
            
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.value !== initialValues.get(this) && !this.classList.contains('error')) {
                        saveMark(this);
                    }
                    
                    // Move to next input
                    const inputs = Array.from(document.querySelectorAll('.mark-input'));
                    const currentIndex = inputs.indexOf(this);
                    if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                    }
                }
            });
        });
        
        // Update stats periodically
        setInterval(updateStats, 1000);
    });

    function markAsModified(input) {
        if (!modifiedInputs.has(input)) {
            modifiedInputs.add(input);
            input.classList.add('modified');
            updateStats();
        }
    }

    function markAsSaved(input) {
        modifiedInputs.delete(input);
        input.classList.remove('modified');
        input.classList.add('saved');
        setTimeout(() => input.classList.remove('saved'), 1000);
        updateStats();
    }

    function markAsError(input) {
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 2000);
    }

    function updateStats() {
        const savedCount = document.querySelectorAll('.mark-input').length - modifiedInputs.size;
        document.getElementById('savedCount').textContent = savedCount;
        document.getElementById('modifiedCount').textContent = modifiedInputs.size;
    }

    function resetToDefaultTotals() {
        if (confirm('Reset all total fields to default value (' + defaultTotal + ')?')) {
            const totalInputs = document.querySelectorAll('.total-field');
            totalInputs.forEach(input => {
                input.value = defaultTotal;
                
                // Validate related marks
                const relatedField = input.dataset.relatedField;
                if (relatedField) {
                    const markInput = document.querySelector(`input[name="${relatedField}"]`);
                    if (markInput && markInput.value !== '') {
                        const markValue = parseFloat(markInput.value);
                        if (markValue > defaultTotal) {
                            showNotification(`Warning: ${markInput.closest('tr').querySelector('td:nth-child(2)').textContent}'s mark (${markValue}) exceeds new total (${defaultTotal})`, '#ffc107');
                            markInput.classList.add('error');
                        }
                    }
                }
                
                if (input.value !== initialValues.get(input)) {
                    markAsModified(input);
                }
            });
            showNotification('Totals reset to default. Click Save to apply changes.', '#ffc107');
        }
    }

    async function saveMark(input, retryCount = 0) {
        if (saveInProgress) return false;
        
        // Check for validation errors before saving
        if (input.classList.contains('error')) {
            showNotification('Please fix validation errors before saving', '#dc3545');
            return false;
        }
        
        const sid = input.dataset.sid;
        const field = input.dataset.field;
        const markId = input.dataset.markId || '';
        const row = document.querySelector(`tr[data-sid="${sid}"]`);
        
        // Get all values for this student
        const testInput = document.querySelector(`input[name="test_${sid}"]`);
        const ttotalInput = document.querySelector(`input[name="ttotal_${sid}"]`);
        const examInput = document.querySelector(`input[name="exam_${sid}"]`);
        const etotalInput = document.querySelector(`input[name="etotal_${sid}"]`);
        
        // Final validation before save
        let isValid = true;
        
        // Validate test against ttotal
        if (testInput && ttotalInput) {
            const testValue = testInput.value === '' ? '' : parseFloat(testInput.value);
            const ttotalValue = ttotalInput.value === '' ? '' : parseFloat(ttotalInput.value);
            const maxTest = (ttotalValue !== '' && !isNaN(ttotalValue)) ? ttotalValue : defaultTotal;
            
            if (testValue !== '' && !isNaN(testValue) && testValue > maxTest) {
                showNotification(`Test mark (${testValue}) cannot exceed test total (${maxTest})`, '#dc3545');
                isValid = false;
            }
        }
        
        // Validate exam against etotal
        if (examInput && etotalInput) {
            const examValue = examInput.value === '' ? '' : parseFloat(examInput.value);
            const etotalValue = etotalInput.value === '' ? '' : parseFloat(etotalInput.value);
            const maxExam = (etotalValue !== '' && !isNaN(etotalValue)) ? etotalValue : defaultTotal;
            
            if (examValue !== '' && !isNaN(examValue) && examValue > maxExam) {
                showNotification(`Exam mark (${examValue}) cannot exceed exam total (${maxExam})`, '#dc3545');
                isValid = false;
            }
        }
        
        if (!isValid) {
            return false;
        }
        
        const test = testInput ? testInput.value : '';
        const ttotal = ttotalInput ? ttotalInput.value : defaultTotal;
        const exam = examInput ? examInput.value : '';
        const etotal = etotalInput ? etotalInput.value : defaultTotal;
        
        // Calculate derived values for database
        const ototal = (test && exam) ? parseFloat(test) + parseFloat(exam) : '';
        const mtotal = (ttotal && etotal) ? parseFloat(ttotal) + parseFloat(etotal) : '';
        
        // Validate the value being saved
        const value = input.value;
        
        // Visual feedback
        input.classList.add('saving');
        
        try {
            const formData = new FormData();
            formData.append('sid', sid);
            formData.append('mark_id', markId);
            formData.append('test', test);
            formData.append('ttotal', ttotal);
            formData.append('exam', exam);
            formData.append('etotal', etotal);
            formData.append('ototal', ototal);  // Hidden calculation
            formData.append('mtotal', mtotal);  // Hidden calculation
            formData.append('me', '<?php echo $me; ?>');
            formData.append('module', '<?php echo $module; ?>');
            formData.append('class', '<?php echo $class; ?>');
            formData.append('term', '<?php echo $term; ?>');
            formData.append('year', '<?php echo $year; ?>');

            const response = await fetch('save_markedit.php', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Save failed');
            }

            // Success
            initialValues.set(input, value);
            markAsSaved(input);
            
            // Update mark_id if returned
            if (data.mark_id) {
                input.dataset.markId = data.mark_id;
                // Update all inputs in this row with the new mark_id
                row.querySelectorAll('.mark-input').forEach(inp => {
                    inp.dataset.markId = data.mark_id;
                });
            }
            
            // Remove new-student class if present
            if (row && row.classList.contains('new-student')) {
                row.classList.remove('new-student');
            }
            
            showNotification(data.message || 'Saved successfully', '#28a745');
            return true;

        } catch (error) {
            console.error('Save error:', error);
            
            // Retry logic (max 3 retries)
            if (retryCount < 3) {
                setTimeout(() => saveMark(input, retryCount + 1), 1000 * (retryCount + 1));
                showNotification(`Retrying... (${retryCount + 1}/3)`, '#ffc107');
            } else {
                input.value = initialValues.get(input);
                markAsError(input);
                showNotification('Save failed after 3 attempts', '#dc3545');
            }
            return false;
        } finally {
            input.classList.remove('saving');
        }
    }

    async function saveAllMarks() {
        if (modifiedInputs.size === 0) {
            showNotification('No changes to save', '#ffc107');
            return;
        }
        
        // Check for any validation errors before saving all
        const errorInputs = document.querySelectorAll('.mark-input.error');
        if (errorInputs.length > 0) {
            showNotification(`Please fix ${errorInputs.length} validation error(s) before saving all`, '#dc3545');
            return;
        }

        saveInProgress = true;
        showNotification(`Saving ${modifiedInputs.size} changes...`, '#667eea');

        let successCount = 0;
        let errorCount = 0;
        const uniqueStudents = new Set();

        // Group by student to avoid duplicate saves
        modifiedInputs.forEach(input => {
            const sid = input.dataset.sid;
            uniqueStudents.add(sid);
        });

        for (const sid of uniqueStudents) {
            // Find any input for this student to trigger save
            const testInput = document.querySelector(`input[name="test_${sid}"]`);
            if (testInput && modifiedInputs.has(testInput)) {
                const success = await saveMark(testInput);
                if (success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } else {
                // If test input not modified, use any modified input for this student
                const anyInput = Array.from(modifiedInputs).find(input => input.dataset.sid === sid);
                if (anyInput) {
                    const success = await saveMark(anyInput);
                    if (success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                }
            }
        }

        saveInProgress = false;

        if (errorCount === 0) {
            showNotification(`Successfully saved ${successCount} students' marks`, '#28a745');
        } else {
            showNotification(`Saved ${successCount} students, failed ${errorCount}`, '#dc3545');
        }
    }

    function showNotification(message, color) {
        const notificationBar = document.getElementById('notification-bar');
        notificationBar.textContent = message;
        notificationBar.style.backgroundColor = color;
        notificationBar.style.opacity = '1';

        setTimeout(() => {
            notificationBar.style.opacity = '0';
        }, 3000);
    }

    // Handle page unload warning
    window.addEventListener('beforeunload', function(e) {
        if (modifiedInputs.size > 0) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
    </script>
    
    <!-- Add Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</body>

</html>
<?php
ob_end_flush();
?>
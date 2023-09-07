const express= require('express')
const mongoose=require('mongoose')
const cors = require('cors'); 
const bodyParser=require('body-parser')

const app = express();
// app.use(cors());

const corsOptions = {
  origin: ['http://localhost:3001', 'https://assign-mentor-to-students.netlify.app'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));



mongoose.connect('mongodb+srv://pratik16:pratik123@cluster0.msm9wp5.mongodb.net/Assign_Mentor',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
})


// Create MongoDB schemas and models
const mentorSchema = new mongoose.Schema({
  name: String,
});
const Mentor = mongoose.model('Mentor', mentorSchema);

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', default: null },
  previousMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor', default: null },
});

const Student = mongoose.model('Student', studentSchema);


  
  // Middleware to parse JSON data
  app.use(bodyParser.json());
  
  // API to Home Page

  app.get("/", function (request, response) {
    response.send('Welcome to Assign Mentor to Student');
  });
  

  // API to create a Mentor
  app.post('/api/mentors', async (req, res) => {
    try {
      const { name } = req.body;
      const mentor = new Mentor({ name });
      await mentor.save();
      res.status(201).json(mentor);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create Mentor' });
    }
  });
  
  // API to create a Student
  app.post('/api/students', async (req, res) => {
    try {
      const { name, mentor } = req.body;
      const student = new Student({ name, mentor });
      await student.save();
      res.status(201).json(student);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create Student' });
    }
  });
  
  
// API to fetch all available mentors
app.get('/api/mentors', async (req, res) => {
    try {
      const mentors = await Mentor.find({});
      res.json(mentors);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch mentors' });
    }
  });
  
  
  // API to fetch all students without any mentor assigned
  app.get('/api/students-without-mentor', async (req, res) => {
    try {
      const students = await Student.find({ mentor: null });
      res.json(students);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch students without mentor' });
    }
  });
  
  // API to fetch all students (with or without mentors)
  app.get('/api/students', async (req, res) => {
    try {
      const students = await Student.find({});
      res.json(students);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch students' });
    }
  });
  
  
  



// API to assign a student to a mentor
app.post('/api/assign-mentor/:mentorId', async (req, res) => {
    try {
      const { mentorId } = req.params;
      const { studentIds } = req.body;
  
      const mentor = await Mentor.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }
  
      const studentsAlreadyAssigned = await Student.find({ mentor: { $ne: null } });
      const studentsToAssign = [];
      const invalidStudentIds = [];
  
      for (const studentId of studentIds) {
        const student = await Student.findById(studentId);
        if (!student) {
          invalidStudentIds.push(studentId);
        } else if (student.mentor) {
          console.log(`Student with ID ${studentId} is already assigned to a mentor`);
        } else {
          studentsToAssign.push(student);
        }
      }
  
      if (invalidStudentIds.length > 0) {
        console.log('Invalid Student IDs:', invalidStudentIds);
      }
  
      for (const student of studentsToAssign) {
        student.mentor = mentorId;
        await student.save();
      }
  
      const assignedStudentIds = studentsToAssign.map((student) => student._id);
  
      res.json({ message: 'Students assigned to Mentor successfully', assignedStudentIds });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to assign students to Mentor' });
    }
  });
  
  
  
  
// API to Assign/change Mentor for a particular Student
app.put('/api/assign-mentor/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      const { mentorId } = req.body;
  
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const mentor = await Mentor.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }
  
      student.previousMentor = student.mentor; // Update the previousMentor field with the current mentor ID
      student.mentor = mentorId; // Assign the student to the new mentor
      await student.save();
  
      res.json({ message: 'Mentor assigned/changed for student successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to assign/change mentor for student' });
    }
  });
  
  
  
  // API to show all students for a particular mentor
  app.get('/api/mentor-students/:mentorId', async (req, res) => {
    try {
      const { mentorId } = req.params;
  
      const mentor = await Mentor.findById(mentorId);
      if (!mentor) {
        return res.status(404).json({ error: 'Mentor not found' });
      }
  
      const students = await Student.find({ mentor: mentorId });
      res.json(students);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch students for the Mentor' });
    }
  });
  
 // API to show the previously assigned mentor for a particular student
app.get('/api/student-mentor/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
  
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
  
      const previousMentorId = student.previousMentor;
      if (!previousMentorId) {
        return res.json({ message: 'Student has no previously assigned mentor' });
      }
  
      const previousMentor = await Mentor.findById(previousMentorId);
      if (!previousMentor) {
        return res.status(404).json({ error: 'Previously assigned mentor not found' });
      }
  
      res.json({ previousMentor: previousMentor.name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch student mentor details' });
    }
  });
  
  
  // Start the server
  const port = 3000;
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
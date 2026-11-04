export const courseEvaluationTemplate=()=>[
  {
    "key": "learning",
    "title": "Contribution to learning",
    "type": "grid",
    "description": "",
    "required": true,
    "options": [
      "Poor",
      "Fair",
      "Satisfactory",
      "Very good",
      "Excellent"
    ],
    "max": 5,
    "rows": [
      "Level of skill/knowledge at start of course",
      "Level of skill/knowledge at middle of course",
      "Contribution of course to your skill/knowledge"
    ]
  },
  {
    "key": "instructor",
    "title": "Instructor Feedback",
    "type": "grid",
    "description": "",
    "required": true,
    "options": [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree"
    ],
    "max": 5,
    "rows": [
      "Instructor was an effective lecturer/demonstrator",
      "Presentations were clear and organized",
      "Instructor effectively used time during class",
      "Instructor was available and helpful",
      "Grading was prompt and had useful feedback",
      "Material used was both theory and practical"
    ]
  },
  {
    "key": "content",
    "title": "Course Content Feedback",
    "type": "grid",
    "description": "",
    "required": true,
    "options": [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree"
    ],
    "max": 5,
    "rows": [
      "Learning objectives were clear",
      "Course content was organized and well planned",
      "The online learning system (Telesom Academy) was useful",
      "The materials (slides, labs, exercises) were helpful",
      "The course met my learning expectations",
      "The pace and length of the course was appropriate"
    ]
  },
  {
    "key": "facilities",
    "title": "Facilities & Learning Environment",
    "type": "grid",
    "description": "",
    "required": true,
    "options": [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree"
    ],
    "max": 5,
    "rows": [
      "The classroom/training room was comfortable",
      "The computers, internet, and lab equipment were adequate",
      "Telesom Academy location was accessible"
    ]
  },
  {
    "key": "valuable",
    "title": "What aspects of this course were most useful or valuable?",
    "type": "paragraph",
    "description": "",
    "required": false,
    "options": [],
    "max": 5
  },
  {
    "key": "improve",
    "title": "How would you improve this course?",
    "type": "paragraph",
    "description": "",
    "required": false,
    "options": [],
    "max": 5
  },
  {
    "key": "cost",
    "title": "Was the cost of the course reasonable?",
    "type": "choice",
    "description": "",
    "required": true,
    "options": [
      "Very Reasonable",
      "Reasonable",
      "Neutral",
      "Expensive",
      "Very Expensive"
    ],
    "max": 5
  },
  {
    "key": "certification",
    "title": "Do you plan to become certified in this area?",
    "type": "choice",
    "description": "Sponsorships available for the first 5 students who pass the certification exam: Meta (full stack), IAB (digital marketing), Adobe Certified Professional (graphic design), or CCNA.",
    "required": true,
    "options": [
      "Yes",
      "No",
      "Maybe"
    ],
    "max": 5
  },
  {
    "key": "experience",
    "title": "Overall Course Experience",
    "type": "grid",
    "description": "",
    "required": true,
    "options": [
      "Poor",
      "Fair",
      "Satisfactory",
      "Very good",
      "Excellent"
    ],
    "max": 5,
    "rows": [
      "Overall experience"
    ]
  },
  {
    "key": "recommend",
    "title": "Would you recommend Telesom Academy?",
    "type": "choice",
    "description": "",
    "required": true,
    "options": [
      "Yes",
      "No",
      "Maybe"
    ],
    "max": 5
  },
  {
    "key": "suggestions",
    "title": "Any other feedback or suggestions for Telesom Academy?",
    "type": "paragraph",
    "description": "",
    "required": false,
    "options": [],
    "max": 5
  }
];

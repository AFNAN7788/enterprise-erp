ERP — API Documentation

>   Base URL:     http://localhost:3000  
>   Auth:   Firebase Authentication
>   Database:   Cloud Firestore


Table of Contents

      [Authentication](authentication)
      [Session Management](session     management)
      [Setup (Admin Bootstrap)](setup     admin     bootstrap)
      [Dashboard Statistics](dashboard     statistics)
      [Employees](employees)
      [Attendance](attendance)
      [Leave Requests](leave     requests)
      [Customers (CRM)](customers     crm)
      [Projects](projects)
      [Tasks](tasks)
      [Products (Inventory)](products     inventory)
      [Orders (Sales & Purchase)](orders     sales   purchase)
      [Expenses](expenses)
      [Payroll](payroll)
      [Notifications](notifications)
      [Documents](documents)
      [Activity Logs](activity     logs)
      [Role     Based Access Matrix](role     based     access     matrix)
      [Firestore Collections Reference](firestore     collections     reference)

 

 Authentication

All API requests require authentication via Firebase Auth. The client signs in using the Firebase SDK, then exchanges the ID token for an HTTP     only session cookie.

 Flow

      
1. Client: signInWithEmailAndPassword(auth, email, password)
2. Client: user.getIdToken() → idToken
3. Client: POST /api/auth/session { idToken }
4. Server: Sets __session cookie (5     day expiry)
5. Client: Redirects to /dashboard
      

 Role Detection

Roles are stored in the   profiles   Firestore collection. The   DashboardShell   component reads the profile on each page load and passes the role to child components.

 

  Firestore Document Created:  
      
Collection: profiles
Document ID: {uid}
{
  id:  firebase     uid ,
  email: admin email ,
  role:  admin ,
  avatar_url: null,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

 

 Dashboard Statistics:

   GET /api/dashboard     stats  

Returns aggregated dashboard statistics scoped by user role.

  Auth:   Requires   __session   cookie (Admin SDK verifies token)

  Response (200):  
      json
{
   stats : {
     totalEmployees : 15,
     pendingLeaves : 3,
     activeProjects : 5,
     lowStockItems : 2,
     monthlySales : 125000,
     monthlyExpenses : 45000,
     attendanceTrend : [
      {  month :  Jan ,  present : 22,  late : 3 },
      {  month :  Feb ,  present : 20,  late : 2 }
    ],
     salesTrend : [
      {  month :  Jan ,  total : 120000 },
      {  month :  Feb ,  total : 135000 }
    ],
     expenseByCategory : [
      {  category :  Travel ,  amount : 15000 },
      {  category :  Office Supplies ,  amount : 8000 }
    ],
     projectStatus : [
      {  status :  active ,  count : 3 },
      {  status :  completed ,  count : 2 }
    ],
     updated_at :  2026     08     19T... 
  },
   role :  admin 
}
      

  Role Scoping:  

| Role       | Scope        | Dashboard Stats Document  
  
| Admin      | Company wide |   dashboardStats/company    
| Manager    | Team only    |   dashboardStats/team_{uid}   
| Employee   | Personal     |   dashboardStats/user_{uid} 
      

 

 Employees

 Server Action:   createEmployeeAction(data)  

Creates a new employee (Firebase Auth user + Firestore profile + employee record).

  Required Role:   Admin

  Request Body (JSON):  
      json
{
   fullName :  John Doe ,
   email :  john@example.com ,
   password :  Password123 ,
   phone :  +92     300     1234567 ,
   department :  Engineering ,
   position :  Software Engineer ,
   status :  active ,
   managerId :  manager     uid     or     null ,
   salary : 80000,
   hireDate :  2026     08     01 ,
   role :  employee 
}
      

  Field Validation (Zod):  

| Field | Type | Required | Constraints |

| fullName | string | ✅ | min 2 chars |
| email | string |    ✅ | valid email |
| password | string | ✅ (create) | min 8 chars |
| phone | string |    ❌ | nullable |
| department | string | ✅ | min 1 char |
| position | string | ✅ | min 1 char |
| status | enum |     ✅ |  active  or  inactive  |
| managerId | string | ❌ | nullable |
| salary | number | ❌ | ≥ 0, nullable |
| hireDate | string | ✅ | min 1 char |
| role | enum | ✅ |  employee ,  manager ,  admin ,  hr  |

  Response (Success):  
      json
{
   success : true,
   employeeId :  firestore     doc     id 
}
      

  Response (Error):  
      json
{
   success : false,
   error :  Error message 
}
      

  Firestore Documents Created:  

      
profiles/{uid}: {
  id:  uid ,
  email:  john@example.com ,
  full_name:  John Doe ,
  role:  employee ,
  avatar_url: null,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}

employees/{auto     id}: {
  profileId:  uid ,
  fullName:  John Doe ,
  email:  john@example.com ,
  phone:  +923001234567 ,
  department:  Engineering ,
  position:  Software Engineer ,
  status:  active ,
  managerId:  manager     uid ,
  salary: 80000,
  hireDate:  2026     08     01 ,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

 

 Server Action:   updateEmployeeAction(employeeDocId, data)  

Updates an existing employee record.

  Required Role:   Admin

  Request Body:  
      json
{
   fullName :  John Updated ,
   department :  Product ,
   status :  active 
}
      

  Response:  
      json
{  success : true }
      

 

 Server Action:   deleteEmployeeAction(employeeDocId)  

Deletes an employee (Firebase Auth user + Firestore records).

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   toggleEmployeeStatusAction(employeeDocId, status)  

Toggles employee status between active/inactive.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Attendance

 Server Action:   checkInAction()  

Records check     in for the current user.

  Required Role:   Any authenticated user

  Request Body:   None (uses decoded token for employeeId)

  Response (Success):  
      json
{
   success : true,
   checkIn :  09:15 ,
   status :  present 
}
      

  Status Logic:  
        present  : Check     in at or before 09:30 PKT
        late  : Check     in after 09:30 PKT

  Response (Already Checked In):  
      json
{
   success : false,
   error :  Already checked in today 
}
      

  Firestore Document:  
      
Collection: attendance
Document ID: {employeeId}_{YYYY     MM     DD}
{
  employeeId:  uid ,
  date:  2026     08     19 ,
  checkIn:  09:15 ,
  checkOut: null,
  status:  present ,
  workHours: null,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   checkOutAction()  

Records check     out for the current user.

  Required Role:   Any authenticated user

  Response (Success):  
      json
{
   success : true,
   checkOut :  17:30 ,
   workHours : 8.25
}
      

  Response (Error):  
      json
{
   success : false,
   error :  Not checked in today 
}
      

 

 Leave Requests

 Server Action:   submitLeaveRequestAction(data)  

Submits a new leave request.

  Required Role:   Any authenticated user

  Request Body:  
      json
{
   type :  sick ,
   startDate :  2026     08     20 ,
   endDate :  2026     08     22 ,
   reason :  Medical appointment 
}
      

  Leave Types:     sick  ,   casual  ,   annual  ,   unpaid  

  Response:  
      json
{
   success : true,
   id :  firestore     doc     id 
}
      

  Firestore Document:  
      
Collection: leaveRequests
{
  employeeId:  uid ,
  employeeName:  John Doe ,
  type:  sick ,
  startDate:  2026     08     20 ,
  endDate:  2026     08     22 ,
  reason:  Medical appointment ,
  status:  pending ,
  reviewedBy: null,
  reviewNote: null,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   approveLeaveRequestAction(requestId, reviewNote?)  

Approves a pending leave request.

  Required Role:   Admin, HR, or Manager (manager can only approve team requests)

  Response:  
      json
{  success : true }
      

  Side Effects:  
      Updates   status   to    approved   
      Sets   reviewedBy   to current user's name
      Creates notification for the employee

 

 Server Action:   rejectLeaveRequestAction(requestId, reviewNote?)  

Rejects a pending leave request.

  Required Role:   Admin, HR 

  Response:  
      json
{  success : true }
      

 

 Customers (CRM)

 Server Action:   createCustomerAction(data)  

Creates a new CRM customer record.

  Required Role:   Admin

  Request Body:  
      json
{
   name :  Acme Corp ,
   company :  Acme Corporation ,
   email :  contact@acme.com ,
   phone :  +92     300     1234567 ,
   status :  lead ,
   assignedTo :  employee     uid ,
   notes :  Potential enterprise client 
}
      

  Customer Statuses:     lead  ,   prospect  ,   active  ,   inactive  

  Response:  
      json
{
   success : true,
   id :  firestore     doc     id 
}
      

  Firestore Document:  
      
Collection: customers
{
  name:  Acme Corp ,
  company:  Acme Corporation ,
  email:  contact@acme.com ,
  phone:  +92     300     1234567 ,
  status:  lead ,
  assignedTo:  employee     uid ,
  assignedToName:  John Doe ,
  notes:  Potential enterprise client ,
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

 

 Server Action:   updateCustomerAction(customerId, data)  

Updates an existing customer.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   deleteCustomerAction(customerId)  

Deletes a customer and all their interactions.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   addInteractionAction(customerId, data)  

Adds an interaction record to a customer.

  Required Role:   Admin

  Request Body:  
      json
{
   type :  call ,
   subject :  Follow     up call ,
   notes :  Discussed pricing and timeline 
}
      

  Interaction Types:     call  ,   email  ,   meeting  

  Response:  
      json
{
   success : true,
   id :  interaction     doc     id 
}
      

  Firestore Document:  
      
Collection: customers/{customerId}/interactions
{
  type:  call ,
  subject:  Follow     up call ,
  notes:  Discussed pricing and timeline ,
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   deleteInteractionAction(customerId, interactionId)  

Deletes an interaction record.

  Required Role:   Customer owner or Admin

  Response:  
      json
{  success : true }
      

 

 Projects

 Server Action:   createProjectAction(data)  

Creates a new project.

  Required Role:   Admin or Manager

  Request Body:  
      json
{
   name :  Website Redesign ,
   description :  Redesign the company website ,
   status :  planning ,
   clientId :  customer     doc     id ,
   managerId :  manager     uid ,
   teamMembers : [ employee1     uid ,  employee2     uid ]
}
      

  Project Statuses:     planning  ,   active  ,   on_hold  ,   completed  

  Response:  
      json
{
   success : true,
   id :  firestore     doc     id 
}
      

  Firestore Document:  
      
Collection: projects
{
  name:  Website Redesign ,
  description:  Redesign the company website ,
  status:  planning ,
  clientId:  customer     doc     id ,
  clientName:  Acme Corp ,
  managerId:  manager     uid ,
  managerName:  Jane Manager ,
  teamMembers: [ employee1     uid ,  employee2     uid ],
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

 

 Server Action:   updateProjectAction(projectId, data)  

Updates an existing project.

  Required Role:   Admin or Manager

  Response:  
      json
{  success : true }
      

 

 Server Action:   deleteProjectAction(projectId)  

Deletes a project and all associated tasks.

  Required Role:   Admin or Manager

  Response:  
      json
{  success : true }
      

 

 Tasks

 Server Action:   createTaskAction(data)  

Creates a new task within a project.

  Required Role:   Admin or Manager

  Request Body:  
      json
{
   projectId :  project     doc     id ,
   title :  Design homepage mockup ,
   description :  Create Figma mockup for homepage ,
   status :  todo ,
   assigneeId :  employee     uid ,
   dueDate :  2026     08     25 ,
   priority :  high 
}
      

  Task Statuses:     todo  ,   in_progress  ,   review  ,   done  
  Task Priorities:     low  ,   medium  ,   high  ,   urgent  

  Response:  
      json
{
   success : true,
   id :  firestore     doc     id 
}
      

  Firestore Document:  
      
Collection: tasks
{
  projectId:  project     doc     id ,
  title:  Design homepage mockup ,
  description:  Create Figma mockup for homepage ,
  status:  todo ,
  assigneeId:  employee     uid ,
  assigneeName:  John Doe ,
  dueDate:  2026     08     25 ,
  priority:  high ,
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

  Side Effects:  
      Creates notification for the assigned employee

 

 Server Action:   updateTaskAction(taskId, data)  

Updates an existing task.

  Required Role:   Admin 

  Response:  
      json
{  success : true }
      

 

 Server Action:   deleteTaskAction(taskId)  

Deletes a task.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   updateTaskStatusAction(taskId, status)  

Updates only the status of a task (assignee can update their own tasks).

  Required Role:   Admin, Task Assignee

  Request Body:  
      json
{
   status :  in_progress 
}
      

  Response:  
      json
{  success : true }
      

 

 Products (Inventory)

 Server Action:   createProductAction(data)  

Creates a new product in inventory.

  Required Role:   Admin

  Request Body:  
      json
{
   name :  Laptop Dell XPS 15 ,
   sku :  DELL     XPS     15 ,
   description :  15     inch laptop ,
   category :  Electronics ,
   quantity : 50,
   unit :  pieces ,
   reorderLevel : 10
}
      

  Response:  
      json
{
   success : true,
   id :  firestore     doc     id 
}
      

  Firestore Document:  
      
Collection: products
{
  name:  Laptop Dell XPS 15 ,
  sku:  DELL     XPS     15 ,
  description:  15     inch laptop ,
  category:  Electronics ,
  quantity: 50,
  unit:  pieces ,
  reorderLevel: 10,
  created_at:  2026     08     19T... ,
  updated_at:  2026     08     19T... 
}
      

 

 Server Action:   updateProductAction(productId, data)  

Updates an existing product.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   deleteProductAction(productId)  

Deletes a product and all associated stock movements.

  Required Role:   Admin

  Response:  
      json
{  success : true }
      

 

 Server Action:   recordStockMovementAction(data)  

Records a stock in/out movement (atomic transaction).

  Required Role:   Admin or Manager

  Request Body:  
      json
{
   productId :  product     doc     id ,
   type :  in ,
   quantity : 20,
   reason :  New shipment received 
}
      

  Movement Types:     in   (stock),   out   (stock)

  Response (Success):  
      json
{  success : true }
      

  Response (Insufficient Stock):  
      json
{
   success : false,
   error :  Insufficient stock 
}
      

  Firestore Documents:  
      
Collection: stockMovements
{
  productId:  product     doc     id ,
  type:  in ,
  quantity: 20,
  reason:  New shipment received ,
  performedBy:  current     user     uid ,
  created_at:  2026     08     19T... 
}

Collection: products/{productId}
// quantity field updated atomically via FieldValue.increment()
      

 

 Orders (Sales & Purchase)

 Server Action:   createSalesOrderAction(data)  

Creates a sales order (atomic: creates order + decreases product stock).

  Required Role:   Admin or Manager

  Request Body:  
      json
{
   customerId :  customer     doc     id ,
   items : [
    {
       productId :  product     doc     id ,
       productName :  Laptop Dell XPS 15 ,
       quantity : 5,
       unitPrice : 150000
    }
  ]
}
      

  Response (Success):  
      json
{  success : true }
      

  Firestore Document:  
      
Collection: salesOrders
{
  orderNumber:  SO     1724073600000 ,
  customerId:  customer     doc     id ,
  customerName:  Acme Corp ,
  items: [
    {
      productId:  product     doc     id ,
      productName:  Laptop Dell XPS 15 ,
      quantity: 5,
      unitPrice: 150000
    }
  ],
  total: 750000,
  status:  pending ,
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   createPurchaseOrderAction(data)  

Creates a purchase order (atomic: creates order + increases product stock).

  Required Role:   Admin or Manager

  Request Body:  
      json
{
   supplier :  Dell Technologies ,
   items : [
    {
       productId :  product     doc     id ,
       productName :  Laptop Dell XPS 15 ,
       quantity : 50,
       unitPrice : 120000
    }
  ]
}
      

  Response:  
      json
{  success : true }
      

  Firestore Document:  
      
Collection: purchaseOrders
{
  orderNumber:  PO     1724073600000 ,
  supplier:  Dell Technologies ,
  items: [...],
  total: 6000000,
  status:  pending ,
  createdBy:  current     user     uid ,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   updateOrderStatusAction(orderId, status)  

Updates order status (sales or purchase).

  Required Role:   Admin or Manager

  Order Statuses:     pending  ,   completed  ,   cancelled  

  Response:  
      json
{  success : true }
      

 

 Expenses

 Server Action:   createExpenseAction(formData)  

Submits a new expense for approval.

  Required Role:   Any authenticated user

  Request Body (FormData):  

| Field      | Type          | Required    | Constraints 

| category   | string        | ✅          | min 1 char 
| amount     | number        | ✅          | > 0 |

  Response (Success):  
      json
{  success : true }
      

  Response (Error):  
      json
{
   success : false,
   error :  Category is required 
}
      

  Firestore Document:  
      
Collection: expenses
{
  category:  Travel ,
  amount: 5000,
  submittedBy:  current     user     uid ,
  submittedByName:  John Doe ,
  approvalStatus:  pending ,
  approvedBy: null,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   updateExpenseStatusAction(expenseId, status)  

Approves or rejects an expense.

  Required Role:   Admin only

  Request Body:  
      json
{
   status :  approved 
}
      

  Expense Statuses:     pending  ,   approved  ,   rejected  

  Response:  
      json
{  success : true }
      

 

 Payroll

 Server Action:   createPayrollAction(formData)  

Creates a payroll record for an employee.

  Required Role:   Admin only

  Request Body (FormData):  

| Field | Type | Required | Constraints |
||  | |  |
| employeeId | string | ✅ | min 1 char |
| basicSalary | number | ✅ | > 0 |
| bonus | number | ❌ | default 0 |
| deductions | number | ❌ | default 0 |
| month | number | ✅ | 1     12 |
| year | number | ✅ | ≥ 2020 |

  Response (Success):  
      json
{  success : true }
      

  Response (Duplicate):  
      json
{
   success : false,
   error :  Payroll record already exists for this employee/month/year 
}
      

  Firestore Document:  
      
Collection: payroll
{
  employeeId:  employee     uid ,
  employeeName:  John Doe ,
  basicSalary: 80000,
  bonus: 5000,
  deductions: 3000,
  netSalary: 82000,
  month: 8,
  year: 2026,
  createdBy:  admin     uid ,
  created_at:  2026     08     19T... 
}
      

 

 Server Action:   getEmployeePayrollHistory(employeeId)  

Returns payroll history for an employee.

  Role Scoping:  
      Admin/HR: Can view any employee's history
      Employee: Can view only their own history

  Response:  
      json
[
  {
     id :  payroll     doc     id ,
     employeeId :  employee     uid ,
     employeeName :  John Doe ,
     basicSalary : 80000,
     bonus : 5000,
     deductions : 3000,
     netSalary : 82000,
     month : 8,
     year : 2026,
     created_at :  2026     08     19T... 
  }
]
      

 

 Server Action:   getPayrollRecord(recordId)  

Returns a single payroll record.

  Required Role:   Admin/HR or record owner

  Response:  
      json
{
   id :  payroll     doc     id ,
   employeeId :  employee     uid ,
   employeeName :  John Doe ,
   basicSalary : 80000,
   bonus : 5000,
   deductions : 3000,
   netSalary : 82000,
   month : 8,
   year : 2026,
   created_at :  2026     08     19T... 
}
      

 

 Notifications

 Server Action:   markNotificationReadAction(notificationId)  

Marks a notification as read.

  Required Role:   Notification owner only

  Response:  
      json
{  success : true }
      

  Firestore Update:  
      
Collection: notifications/{notificationId}
{
  isRead: true,
  updated_at:  2026     08     19T... 
}
      

 

 Documents

 Server Action:   deleteDocumentAction(documentId)  

Deletes a document record and its file from Firebase Storage.

  Required Role:    Admin, HR

  Response (Success):  
      json
{  success : true }
      

  Response (Error):  
      json
{
   success : false,
   error :  Failed to delete document 
}
      

  Side Effects:  
      Deletes file from Firebase Storage at   documents/{uploadedBy}/{fileName}  
      Deletes Firestore document record

  Firestore Document Structure:  
      
Collection: documents
{
  fileName:  report.pdf ,
  fileSize: 1024000,
  fileType:  application/pdf ,
  storagePath:  documents/uid/report.pdf ,
  downloadURL:  https://firebasestorage... ,
  uploadedBy:  user     uid ,
  uploadedByName:  John Doe ,
  relatedModule:  employee ,
  relatedId:  employee     doc     id ,
  created_at:  2026     08     19T... 
}
      

 

 Activity Logs

 Server Action:   getActivityLogsAction(params)  

Returns paginated activity logs (audit trail).

  Required Role:   Admin only

  Request Params:  
      json
{
   module :  employees ,
   action :  create ,
   search :  john ,
   lastDocId :  last     doc     id     for     pagination 
}
      

| Param | Type | Required | Description |

| module | string | ❌ | Filter by module (employees, projects, etc.) |
| action | string | ❌ | Filter by action (create, update, delete) |
| search | string | ❌ | Search term (accepted but not implemented) |
| lastDocId | string | ❌ | Pagination cursor |

  Response:  
      json
{
   logs : [
    {
       id :  log     doc     id ,
       userId :  admin     uid ,
       userName :  Admin User ,
       action :  create ,
       module :  employees ,
       recordId :  employee     doc     id ,
       details : {
  name :  John Doe ,
  department :  Engineering 
      },
       created_at :  2026     08     19T... 
    }
  ],
   hasMore : true,
   lastDocId :  last     log     doc     id 
}
      

  Pagination:  
      Page size: 20 records
      Use   lastDocId   from response to fetch next page
        hasMore: false   indicates no more records

 

 Role     Based Access Matrix

| Action | Admin | HR | Manager | Employee |
|     ||      |   | |
|   Authentication   | | | | |
| Register new user | ✅ | ✅ | ✅ | ✅ |
| Create profile | ✅ | ✅ | ✅ | ✅ |
|   Employees   | | | | |
| View all employees | ✅ | ✅ | ✅ (team) | ✅ (own) |
| Create employee | ✅ | ✅ | ❌ | ❌ |
| Update employee | ✅ | ✅ | ❌ | ❌ |
| Delete employee | ✅ | ❌ | ❌ | ❌ |
| Toggle status | ✅ | ❌ | ❌ | ❌ |
|   Attendance   | | | | |
| Check in/out | ✅ | ✅ | ✅ | ✅ |
| View all attendance | ✅ | ✅ | ✅ (team) | ✅ (own) |
|   Leave Requests   | | | | |
| Submit leave | ✅ | ✅ | ✅ | ✅ |
| Approve/reject | ✅ | ✅ | ✅ (team) | ❌ |
|   CRM   | | | | |
| View customers | ✅ | ✅ | ✅ | ✅ (assigned) |
| Create customer | ✅ | ✅ | ✅ | ✅ |
| Update customer | ✅ | ✅ | ✅ (assigned) | ✅ (assigned) |
| Delete customer | ✅ | ❌ | ❌ | ❌ |
| Add interaction | ✅ | ✅ | ✅ (assigned) | ✅ (assigned) |
|   Projects   | | | | |
| View projects | ✅ | ✅ | ✅ | ✅ (assigned) |
| Create project | ✅ | ❌ | ✅ | ❌ |
| Update project | ✅ | ❌ | ✅ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
|   Tasks   | | | | |
| View tasks | ✅ | ✅ | ✅ | ✅ (assigned) |
| Create task | ✅ | ❌ | ✅ | ❌ |
| Update task | ✅ | ❌ | ✅ | ✅ (status only) |
| Delete task | ✅ | ❌ | ❌ | ❌ |
|   Inventory   | | | | |
| View products | ✅ | ✅ | ✅ | ✅ |
| Create/update product | ✅ | ❌ | ✅ | ❌ |
| Delete product | ✅ | ❌ | ❌ | ❌ |
| Record stock movement | ✅ | ❌ | ✅ | ❌ |
|   Orders   | | | | |
| View orders | ✅ | ✅ | ✅ | ✅ (own) |
| Create order | ✅ | ❌ | ✅ | ❌ |
| Update order status | ✅ | ❌ | ✅ | ❌ |
|   Expenses   | | | | |
| View expenses | ✅ | ✅ | ✅ (team) | ✅ (own) |
| Submit expense | ✅ | ✅ | ✅ | ✅ |
| Approve expense | ✅ | ❌ | ❌ | ❌ |
|   Payroll   | | | | |
| View payroll | ✅ (all) | ✅ (all) | ❌ | ✅ (own) |
| Create payroll | ✅ | ❌ | ❌ | ❌ |
|   Notifications   | | | | |
| View notifications | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |
| Mark as read | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) |
|   Documents   | | | | |
| View documents | ✅ | ✅ | ✅ (own) | ✅ (own) |
| Upload document | ✅ | ✅ | ✅ | ✅ |
| Delete document | ✅ | ✅ | ❌ | ✅ (own) |
|   Activity Logs   | | | | |
| View logs | ✅ | ❌ | ❌ | ❌ |
|   Dashboard   | | | | |
| View stats | ✅ (company) | ✅ (company) | ✅ (team) | ✅ (personal) |

 

 Firestore Collections Reference

| Collection | Description | Key Fields |
|    |  |    |
|   profiles   | User profiles with roles | id, email, full_name, role, avatar_url |
|   employees   | Employee records | profileId, fullName, department, position, status, managerId, salary |
|   attendance   | Daily check     in/out records | employeeId, date, checkIn, checkOut, status, workHours |
|   leaveRequests   | Leave request workflow | employeeId, type, startDate, endDate, status, reviewedBy |
|   customers   | CRM customers | name, company, status, assignedTo |
|   customers/{id}/interactions   | Customer interactions (subcollection) | type, subject, notes, createdBy |
|   projects   | Project records | name, status, managerId, teamMembers, clientId |
|   tasks   | Task records | projectId, title, status, assigneeId, priority, dueDate |
|   products   | Inventory items | name, sku, category, quantity, reorderLevel |
|   stockMovements   | Stock in/out records | productId, type, quantity, reason |
|   salesOrders   | Sales orders | orderNumber, customerId, items, total, status |
|   purchaseOrders   | Purchase orders | orderNumber, supplier, items, total, status |
|   expenses   | Expense submissions | category, amount, submittedBy, approvalStatus |
|   payroll   | Payroll records | employeeId, basicSalary, bonus, deductions, netSalary, month, year |
|   notifications   | User notifications | userId, title, message, type, isRead, link |
|   documents   | File upload metadata | fileName, storagePath, downloadURL, uploadedBy |
|   activityLogs   | Audit trail | userId, action, module, recordId, details |
|   dashboardStats   | Precomputed aggregates | Scope     specific stats (company, team, user) |

 

 Error Handling

All server actions follow this error response pattern:

      typescript
// Success
{ success: true, id?: string }

// Error
{ success: false, error:  Human     readable error message  }
      

API routes return standard HTTP status codes:

| Code | Meaning |
|  |   |
| 200 | Success |
| 400 | Bad request (missing/invalid parameters) |
| 401 | Unauthorized (no session cookie) |
| 403 | Forbidden (insufficient permissions) |
| 409 | Conflict (e.g., admin already exists) |
| 500 | Internal server error |

 

 Rate Limiting

No rate limiting is currently implemented. For production, consider:
      Firebase App Check for client validation
      Cloud Functions for critical operations
      Firestore security rules for data validation

 

 Timezone

All timestamps are in   PKT (Pakistan Standard Time, UTC+5)   unless otherwise specified. Attendance check     in/out times use PKT.

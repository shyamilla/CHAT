import { Routes } from '@angular/router';

// Public
import { LoginComponent } from '../app/auth/login/login';
import { RegisterComponent } from '../app/auth/register/register';
import { ForgotPasswordComponent } from '../app/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from '../app/auth/reset-password/reset-password';

// Protected (JWT required)
import { ChatListComponent } from '../app/chat/chat-list/chat-list';
import { ChatRoomComponent } from '../app/chat/chat-room/chat-room';
import { CreateGroupComponent } from '../app/chat/create-group/create-group';
// import { ModifyGroupComponent } from '../app/chat/modify-group/modify-group';

// Auth Guard
import { AuthGuard } from '../app/core/guards/auth-guard';
import { PersonalChatComponent } from './chat/personal-chat/personal-chat';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  { path: 'chats', component: ChatListComponent, canActivate: [AuthGuard] },
  { path: 'chats/rooms/:id', component: ChatRoomComponent, canActivate: [AuthGuard] },
  { path: 'chats/create-group', component: CreateGroupComponent, canActivate: [AuthGuard] },
  // { path: 'chats/modify-group/:id', component: ModifyGroupComponent, canActivate: [AuthGuard] },


  { path: 'chats/personal/:username', component: PersonalChatComponent, canActivate: [AuthGuard] },


  { path: '**', redirectTo: 'login' }
];


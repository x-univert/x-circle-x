import { RouteType } from 'types';
import Home from 'pages/Home';
import Circles from 'pages/Circles';
import CreateCircle from 'pages/CreateCircle';
import Dashboard from 'pages/Dashboard';
import CircleDetails from 'pages/CircleDetails';
import CircleOfLife from 'pages/CircleOfLife';
import Staking from 'pages/Staking';
import IDO from 'pages/IDO';
import Vesting from 'pages/Vesting';
import About from 'pages/About';
import Whitepaper from 'pages/Whitepaper';
import Profile from 'pages/Profile';
import { Unlock } from 'pages/Unlock';

export enum RouteNamesEnum {
  home = '/',
  circles = '/circles',
  createCircle = '/create-circle',
  dashboard = '/dashboard',
  circleDetails = '/circle/:id',
  circleOfLife = '/circle-of-life',
  staking = '/staking',
  ido = '/ido',
  vesting = '/vesting',
  unlock = '/unlock',
  about = '/about',
  whitepaper = '/whitepaper',
  profile = '/profile'
}

interface RouteWithTitleType extends RouteType {
  title: string;
}

export const routes: RouteWithTitleType[] = [
  {
    path: RouteNamesEnum.home,
    title: 'Circle of Life',
    component: CircleOfLife
  },
  {
    path: RouteNamesEnum.unlock,
    title: 'Unlock',
    component: Unlock
  },
  {
    path: RouteNamesEnum.circles,
    title: 'Circles',
    component: Circles
  },
  {
    path: RouteNamesEnum.createCircle,
    title: 'Create Circle',
    component: CreateCircle
  },
  {
    path: RouteNamesEnum.dashboard,
    title: 'Dashboard',
    component: Dashboard
  },
  {
    path: RouteNamesEnum.circleDetails,
    title: 'Circle Details',
    component: CircleDetails
  },
  {
    path: RouteNamesEnum.circleOfLife,
    title: 'Circle of Life',
    component: CircleOfLife
  },
  {
    path: RouteNamesEnum.staking,
    title: 'Staking',
    component: Staking
  },
  {
    path: RouteNamesEnum.ido,
    title: 'IDO',
    component: IDO
  },
  {
    path: RouteNamesEnum.vesting,
    title: 'Vesting',
    component: Vesting
  },
  {
    path: RouteNamesEnum.about,
    title: 'About',
    component: About
  },
  {
    path: RouteNamesEnum.whitepaper,
    title: 'Whitepaper',
    component: Whitepaper
  },
  {
    path: RouteNamesEnum.profile,
    title: 'Profile',
    component: Profile
  }
];

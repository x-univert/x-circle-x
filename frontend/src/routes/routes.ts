import { RouteType } from 'types';
import Home from 'pages/Home';
import Circles from 'pages/Circles';
import CreateCircle from 'pages/CreateCircle';
import Dashboard from 'pages/Dashboard';
import CircleDetails from 'pages/CircleDetails';
import CircleOfLife from 'pages/CircleOfLife';
import Staking from 'pages/Staking';
import InvestmentCircle from 'pages/InvestmentCircle';
import IDO from 'pages/IDO';
import Vesting from 'pages/Vesting';
import About from 'pages/About';
import Whitepaper from 'pages/Whitepaper';
import Profile from 'pages/Profile';
import SatelliteMap from 'pages/SatelliteMap';
import { Unlock } from 'pages/Unlock';
import { RouteNamesEnum } from 'localConstants';

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
    path: RouteNamesEnum.investmentCircle,
    title: 'Investment Circle',
    component: InvestmentCircle
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
  },
  {
    path: RouteNamesEnum.satelliteMap,
    title: 'Satellite Map',
    component: SatelliteMap
  }
];

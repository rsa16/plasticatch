import { Redirect } from 'expo-router';

/** The app shell's default screen. */
export default function Index() {
  return <Redirect href="/map" />;
}

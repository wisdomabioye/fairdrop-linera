import { useLineraApplication } from 'linera-react-client';
import { AAC_APP_ID } from '@/config/app.config';

export function useAacApp() {
    const aacApp = useLineraApplication(AAC_APP_ID);
    return aacApp.app
}
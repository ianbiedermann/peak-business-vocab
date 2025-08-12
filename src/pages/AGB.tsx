import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AGB = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>

          <h1 className="text-3xl font-bold text-foreground">
            Allgemeine Geschäftsbedingungen
          </h1>
        </div>

        <Card className="p-6">
          {/* prose für schöne Typografie + space-y-6 für eine Leerzeile zwischen allen Abschnitten */}
          <div className="prose prose-slate prose-lg dark:prose-invert max-w-none">
            <div className="space-y-6">
              <h2>Allgemeine Geschäftsbedingungen (AGB) der App PeakEnglish</h2>

              <h3>1. Geltungsbereich</h3>
              <p>
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der mobilen App PeakEnglish und der zugehörigen WebApp (im Folgenden „App“ genannt), die von Ian Biedermann betrieben wird. Mit dem Herunterladen und der Nutzung der App erklärst du dich mit diesen AGB einverstanden.
              </p>

              <h3>2. Leistungsbeschreibung</h3>
              <p>
                PeakEnglish ist eine Lern-App, die Nutzern hilft, Englisch-Vokabeln zu lernen. Nutzer haben die Möglichkeit, vorgefertigte kostenfreie Vokabellisten sowie eigene, individuell erstellte Vokabellisten zu nutzen. Gegen Gebühr können Nutzer zusätzliche, kostenpflichtige Vokabellisten freischalten.
              </p>

              <h3>3. Nutzung der App</h3>
              <p>
                Die Nutzung der App ist ab einem Alter von 16 Jahren gestattet. Nutzer unter 16 Jahren müssen die Zustimmung eines Erziehungsberechtigten einholen. Die Nutzung der App erfolgt ausschließlich zu privaten, nicht-kommerziellen Zwecken.
              </p>

              <h3>4. Registrierung und Nutzerkonto</h3>
              <p>
                Für den Zugriff auf die nicht kostenpflichtigen Funktionen der App ist eine Registrierung erforderlich. Du musst ein Nutzerkonto erstellen und dich mit einer gültigen E-Mail-Adresse und einem Passwort anmelden. Die Zugangsdaten sind geheim zu halten und dürfen nicht an Dritte weitergegeben werden. Du bist für alle Aktivitäten, die unter deinem Nutzerkonto stattfinden, verantwortlich.
              </p>

              <h3>5. Kostenpflichtige Dienste und Abonnements</h3>
              <p>
                PeakEnglish bietet kostenpflichtige Funktionen in Form eines monatlichen Abonnements zum Preis von 3,99 € an. Das Abonnement verlängert sich automatisch, wenn es nicht vor Ablauf der aktuellen Abonnementperiode gekündigt wird. Die Zahlung erfolgt über Stripe und kann mit den folgenden Zahlungsmethoden getätigt werden: Amazon Pay, Visa, Klarna.
              </p>

              <ul>
                <li><strong>Preismodell:</strong> 3,99 € monatlich</li>
                <li>
                  <strong>Zahlungsbedingungen:</strong> Zahlungen sind im Voraus fällig. Die Kündigung des Abonnements erfolgt direkt in der App. Du kannst das Abonnement jederzeit kündigen. Es erfolgt keine Rückerstattung bereits bezahlter Beträge, jedoch kannst du kostenpflichtige Funktionen der App bis zum Ende des laufenden Abrechnungszeitraums weiterhin nutzen.
                </li>
              </ul>

              <h3>6. Haftungsausschluss</h3>
              <p>
                Die Nutzung der App erfolgt auf eigene Verantwortung. Ian Biedermann übernimmt keine Haftung für direkte oder indirekte Schäden, die aus der Nutzung oder Unmöglichkeit der Nutzung der App entstehen, einschließlich, aber nicht beschränkt auf Schäden an Geräten, Datenverlust oder entgangenen Gewinn.
              </p>
              <p>
                Die App wird „wie besehen“ zur Verfügung gestellt, und es wird keine Garantie für die ununterbrochene Verfügbarkeit oder Fehlerfreiheit der App gegeben.
              </p>

              <h3>7. Urheberrecht</h3>
              <p>
                Alle Inhalte der App, einschließlich, aber nicht beschränkt auf Vokabellisten, Texte, Grafiken und Design, sind urheberrechtlich geschützt und dürfen ohne ausdrückliche Genehmigung von Ian Biedermann nicht vervielfältigt, verbreitet oder anderweitig verwendet werden.
              </p>

              <h3>8. Datenschutz</h3>
              <p>
                Der Umgang mit deinen persönlichen Daten erfolgt gemäß unserer Datenschutzerklärung. Deine Daten werden nur im Rahmen der Nutzung der App und der angebotenen Funktionen verarbeitet.
              </p>

              <h3>9. Änderung der AGB</h3>
              <p>
                Ian Biedermann behält sich das Recht vor, diese AGB jederzeit zu ändern. Änderungen werden in der App und/oder auf der Website veröffentlicht. Die Änderungen treten mit ihrer Veröffentlichung in Kraft, es sei denn, es ist eine spätere Wirksamkeit festgelegt.
              </p>

              <h3>10. Schlussbestimmungen</h3>
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland, unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AGB;

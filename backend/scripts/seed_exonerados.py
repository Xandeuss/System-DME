"""
Importa a listagem de exonerados para o PostgreSQL.
Uso: python -m backend.scripts.seed_exonerados
"""

import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from dotenv import load_dotenv
load_dotenv()

import psycopg
from datetime import date

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL não configurado no .env"); sys.exit(1)

_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}

_RE = re.compile(
    r"^\* (.+?) \[([^\]]+)\] \{([^}]+)\} - (\d+) (\w+) (\d{4}) - (\d+) (\w+) (\d{4})",
    re.MULTILINE,
)

_RAW = """\
* Guilherme-GGG [FME] {Golpe de Estado} - 10 Jan 2023 - 10 Jan 2028
* :.SrRodrigues.: [FME] {Golpe de Estado} - 10 Jan 2023 - 10 Jan 2028
* mick244 [FME] {Golpe de Estado/Motim} - 10 Jan 2023 - 10 Jan 2028
* 2:U [FME] {Golpe de Estado/Motim} - 10 Jan 2023 - 10 Jan 2028
* ,LucasTeles [FME] {Golpe de Estado} - 10 Jan 2023 - 10 Jan 2028
* Arceur [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* Lan:. [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* Matrix:Louko: [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* -Yuukimaru- [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* CEROL777 [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* Clawest [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* ::JV::. [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* Segu.Ricos [FME] {Terrorismo} - 10 Jan 2023 - 10 Jan 2028
* SR.NIGHTFALCON [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ob:Souza:do [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Swepps [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Alan.Ricos [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* hallef0311 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Optimi [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -Wag [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* eduardobon89 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* djbreno157Chef [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* :Neck: [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* xBrunoS2 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* LuuuCr7 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* teeeuus [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* HenriqueBlack. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* sorriso823 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Lopey [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* boygustavo500 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Calculista, [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* HUNDER11 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Negresco14 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ajoao55 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* N1kklaus [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* :-Instructor-: [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* TarekSS [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Heartlessz [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Undboard [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* magicrhuanh [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* 7Queiiijos [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Hawmitch [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* souzamarco21 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* hyyhyh66 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* .:Extexi. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -Lucken- [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Dr.joel22 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* lucas71700 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -Zeno_sama, [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* tronlucasm17. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* vitorsbrandao [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ozzythebest [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* LightBareMedula [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* herorenanc [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* B_Oliv8 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* bieel4866 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* perfid [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ricardo87472 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -.1Gui-. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ..:PlayBoOy:.. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* MarcioPaul [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* mariacleofas [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* FernandoLDJ [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* profepolicban [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* .:Sheik:.: [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Juniior01Wolf [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Junin7CM [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* ostenjogador [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* :Meec [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -Arcade- [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Sr.Federer [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* geena117 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Lidara1001 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* p4to.s2 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* giovann01912 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Sr.Henrique171 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* kauan19424 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Km15u [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* matheus44898 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* MarcosF-PQD [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Serenattinho [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* WalaceDeath [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Sz_Goddess_Sz [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* imtsBR [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Naoki.Boss [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* hytallo29 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* gabriel71376 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* -Slayer [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Xx.MaTaDoRxxX. [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* TuTyFFC [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Marlyson0896 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Littlebodyforh [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Jelby [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* lilizito22 [DME] {Ataque.} - 10 Jan 2023 - 10 Jan 2028
* SKayyz1 [DME] {Ataque.} - 10 Jan 2023 - 10 Jan 2028
* MisterRafael619 [DME] {Ataque.} - 10 Jan 2023 - 10 Jan 2028
* luelylindad [DME] {Acesso duplo/Omissão da verdade/Difamação.} - 10 Jan 2023 - 10 Jan 2028
* Sarah_Bukkaker [DME] {Insubordinação/Desrespeito/Conduta Imprópria/Desonra.} - 10 Jan 2023 - 10 Jan 2028
* ardosia68 [DME] {Reincidência da traição.} - 10 Jan 2023 - 10 Jan 2028
* gabrielhue20102 [DME] {Reincidência de traição.} - 10 Jan 2023 - 10 Jan 2028
* dudiinhhah [DME] {Plágio/Desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* 08Lili08 [DME] {Acesso duplo/Ameaça.} - 10 Jan 2023 - 10 Jan 2028
* kratososuper99 [DME] {Motim.} - 10 Jan 2023 - 10 Jan 2028
* Chiyou [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* DiscoDreew [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* gilmaraantonia [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* vitoriau1234567 [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* ricardo250j [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* rickharrisonGS [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* iTreep [DME] {Fake de exonerado CEROL777.} - 10 Jan 2023 - 10 Jan 2028
* alemaumzinho [DME] {Fake.} - 10 Jan 2023 - 10 Jan 2028
* nicolas15Metal [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* nico1511 [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* CXN [DME] {Fake de Exonerado Matrix:Louko.} - 10 Jan 2023 - 10 Jan 2028
* Juaones_Burgo [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* Modestia777 [DME] {Fake de exonerado CEROL777.} - 10 Jan 2023 - 10 Jan 2028
* Alegria06 [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* oliveira2310 [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2028
* falo15 [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* 12davi12 [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* nicolas926Magic [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* IrritanteDeus [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* GgabrielhueGHUE [DME] {Fake de exonerado gabrielhue20102.} - 10 Jan 2023 - 10 Jan 2028
* Melinho96 [DME] {Conduta imprópria/Desrespeito/Acesso Duplo/Injúria.} - 10 Jan 2023 - 10 Jan 2028
* ser-1-8-77 [DME] {Fake de exonerado elitet401br.} - 10 Jan 2023 - 10 Jan 2028
* RagnarLock [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* SoldadoNicolau [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* falo12 [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* mariaedu8430 [DME] {Fake de exonerado sarah_gatinhahh.} - 10 Jan 2023 - 10 Jan 2028
* yudf [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* gilzinhaET [DME] {Fake de exonerado ardosia68.} - 10 Jan 2023 - 10 Jan 2028
* p-TROIA-q [DME] {Ataque de Negociações.} - 10 Jan 2023 - 10 Jan 2028
* Cayzinha [DME] {Estelionato.} - 10 Jan 2023 - 10 Jan 2028
* lucasleikan [DME] {LGBTQIA+fobia/baderna/desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* :CIRILO: [DME] {Fake do Exonerado CEROL777.} - 10 Jan 2023 - 10 Jan 2028
* TojiBerrantero [DME] {Fake de Exonerado Bashire.} - 10 Jan 2023 - 10 Jan 2028
* ster0074 [DME] {Fake de exonerado Bashire.} - 10 Jan 2023 - 10 Jan 2028
* Aduke [DME] {Fake de exonerado Bashire.} - 10 Jan 2023 - 10 Jan 2028
* Queiroz178 [DME] {Conduta imprópria/baderna/desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* valentinasss2 [DME] {Fake de exonerado ribamarr9.} - 10 Jan 2023 - 10 Jan 2028
* PTH-157. [DME] {Baderna/desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* zlokmestre [DME] {Ataque/Quebra de Sigilo/Negligência.} - 10 Jan 2023 - 10 Jan 2028
* isavxs. [DME] {Fake.} - 10 Jan 2023 - 10 Jan 2028
* FilhoDoV0l. [DME] {Falsificação.} - 10 Jan 2023 - 10 Jan 2028
* LordManeiro987 [DME] {Ataque.} - 10 Jan 2023 - 10 Jan 2028
* chateu50 [DME] {Nick inapropriado.} - 10 Jan 2023 - 10 Jan 2028
* espancagay2 [DME] {Nick inapropriado/Discriminação.} - 10 Jan 2023 - 10 Jan 2028
* Daniel-Reis25 [DME] {Conduta imprópria/Baderna/Desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* Ser-69-72 [DME] {Nick impróprio.} - 10 Jan 2023 - 10 Jan 2028
* diva.14 [DME] {Plágio.} - 10 Jan 2023 - 10 Jan 2028
* debmel13 [DME] {Fake de exonerado diva.14.} - 10 Jan 2023 - 10 Jan 2028
* Profjoseplay. [DME] {Fake.} - 10 Jan 2023 - 10 Jan 2028
* Ktiz [DME] {Plágio.} - 10 Jan 2023 - 10 Jan 2028
* Jaah_master [DME] {Plágio/Desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* etugozito [DME] {Plágio.} - 10 Jan 2023 - 10 Jan 2028
* Felipinho_01 [DME] {Plágio.} - 10 Jan 2023 - 10 Jan 2028
* mayra9331 [DME] {Conduta imprópria/Difamação/Calúnia/Quebra de sigilo.} - 10 Jan 2023 - 10 Jan 2028
* @FF_Itachix3 [DME] {Terrorismo.} - 10 Jan 2023 - 10 Jan 2028
* Roi?SouNovoAqui [DME] {Fake de Exonerado.} - 10 Jan 2023 - 10 Jan 2028
* BlackWhithe [DME] {Fake de Exonerado.} - 10 Jan 2023 - 10 Jan 2028
* Digoala_. [DME] {Falsificação de cargo/Baderna.} - 10 Jan 2023 - 10 Jan 2028
* conadtituamae [DME] {Racismo.} - 10 Jan 2023 - 10 Jan 2028
* Kauanplays01 [DME] {Fake de exonerado KauanDBV.} - 10 Jan 2023 - 10 Jan 2028
* CarlSagan1996 [DME] {Assédio.} - 10 Jan 2023 - 10 Jan 2028
* willian2109 [DME] {Fake.} - 10 Jan 2023 - 10 Jan 2028
* KallyanGamer [DME] {Discriminação/Machismo.} - 10 Jan 2023 - 10 Jan 2028
* SHAQUILLEONEAL. [DME] {Baderna/Desrespeito.} - 10 Jan 2023 - 10 Jan 2028
* Zaly [DME] {Baderna.} - 10 Jan 2023 - 10 Jan 2028
* senior_ [DME] {Discriminação/Machismo.} - 10 Jan 2023 - 10 Jan 2028
* Cleysonn_ [DME] {Discriminação/Machismo.} - 10 Jan 2023 - 10 Jan 2028
* Ser06x73 [DME] {Racismo.} - 10 Jan 2023 - 10 Jan 2028
* GilSouza12 [DME] {Desonra a soberania da instituição.} - 10 Jan 2023 - 10 Jan 2026
* davi17043 [DME] {Autopromoção/Traição/Desrespeito.} - 10 Jan 2023 - 10 Jan 2026
* Ardosia68Star [DME] {Fake de exonerado.} - 10 Jan 2023 - 10 Jan 2026
* NandaDave [DME] {Desrespeito/baderna/acesso duplo.} - 10 Jan 2023 - 10 Jan 2026
* elitet401br [DME] {Desrespeito/insubordinação/baderna/acesso duplo.} - 10 Jan 2023 - 10 Jan 2026
* ser28-5-3 [DME] {Desrespeito/baderna/fake.} - 10 Jan 2023 - 10 Jan 2026
* gustavo61304 [DME] {Baderna, flood, tentativa de invasão e criação de fakes.} - 10 Jan 2023 - 10 Jan 2026
* izo1102 [DME] {Baderna, flood, tentativa de invasão e criação de fakes.} - 10 Jan 2023 - 10 Jan 2026
* Hillary_B3st [DME] {Conta dupla/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* BrunoG-BAN [DME] {Desrespeito/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* rockluccaw30 [DME] {Desrespeito/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* gata11224455 [DME] {Desrespeito/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* AquaLife_ [DME] {Fake.} - 10 Jan 2023 - 10 Jan 2026
* Caveirao777 [DME] {Tentativa de Invasão/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* LightSender2020 [DME] {Acesso Duplo/Traição.} - 10 Jan 2023 - 10 Jan 2026
* gamermarve [DME] {Acesso Duplo/Traição.} - 10 Jan 2023 - 10 Jan 2026
* Parzewski [DME] {Ataque de Flood.} - 10 Jan 2023 - 10 Jan 2026
* DiretorSan [DME] {Ataque de Flood.} - 10 Jan 2023 - 10 Jan 2026
* 4P!ntos [DME] {Ataque de Flood.} - 10 Jan 2023 - 10 Jan 2026
* LeandroLopees [DME] {Tentativa de Terrorismo.} - 10 Jan 2023 - 10 Jan 2026
* allyo100 [DME] {Baderna/Conduta Imprópria/Fake.} - 10 Jan 2023 - 10 Jan 2026
* DrBerlim [DME] {Tentativa de invasão.} - 10 Jan 2023 - 10 Jan 2026
* MCDERYCK451 [DME] {Conduta Imprópria/Baderna/Falsificação de patente.} - 10 Jan 2023 - 10 Jan 2026
* C?! [DME] {Acesso Duplo.} - 10 Jan 2023 - 10 Jan 2026
* ojeanno90 [DME] {Acesso Duplo.} - 10 Jan 2023 - 10 Jan 2026
* @Lary.Silva [DME] {Acesso Duplo.} - 10 Jan 2023 - 10 Jan 2026
* kenner019 [DME] {Ataque de Flood.} - 10 Jan 2023 - 10 Jan 2026
* Churruminoo [DME] {Assédio/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* Pain1933 [DME] {Tentativa de Invasão.} - 10 Jan 2023 - 10 Jan 2026
* maisricoqtu [DME] {Tentativa de Invasão.} - 10 Jan 2023 - 10 Jan 2026
* Desviava [DME] {Baderna/Desrespeito.} - 10 Jan 2023 - 10 Jan 2026
* 16k2 [DME] {Ataque de flood.} - 10 Jan 2023 - 10 Jan 2026
* Xyhs [DME] {Ataque de negociações.} - 10 Jan 2023 - 10 Jan 2026
* IncoRei [DME] {Ataque de negociações.} - 10 Jan 2023 - 10 Jan 2026
* galdinao [DME] {Ataque de flood.} - 10 Jan 2023 - 10 Jan 2026
* Guigo708 [DME] {Baderna/Desrespeito/Conduta Imprópria/Falsificação/Tentativa de invasão.} - 10 Jan 2023 - 10 Jan 2026
* Kksau [DME] {Conduta Imprópria/Desrespeito/Baderna/Fake.} - 10 Jan 2023 - 10 Jan 2026
* Choravas [DME] {Conduta Imprópria/Desrespeito/Baderna/Fake.} - 10 Jan 2023 - 10 Jan 2026
* ...Satanas.... [DME] {Conduta Imprópria/Desrespeito/Baderna/Fake.} - 10 Jan 2023 - 10 Jan 2026
* ppbug2 [DME] {Difamação.} - 10 Jan 2023 - 10 Jan 2026
* matterazzi98 [DME] {Desrespeito/Conduta imprópria/Baderna.} - 10 Jan 2023 - 10 Jan 2026
* Leun [DME] {Acusação sem provas/Acesso Triplo.} - 10 Jan 2023 - 10 Jan 2026
* Eroun [DME] {Acusação sem provas/Acesso Triplo.} - 10 Jan 2023 - 10 Jan 2026
* Werlom [DME] {Acusação sem provas/Acesso Triplo.} - 11 Jan 2023 - 11 Jan 2026
* Mikhail.Belikov [DME] {Acusação sem provas.} - 11 Jan 2023 - 11 Jan 2026
* @Neutro: [DME] {Baderna/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* PabloEscobar999 [DME] {Baderna/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* LukasHermnn [DME] {Baderna/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* Richard4535 [DME] {Ataque de flood/baderna.} - 11 Jan 2023 - 11 Jan 2026
* chesterSkatista [DME] {Baderna/Flood.} - 11 Jan 2023 - 11 Jan 2026
* pedrobrwwe [DME] {Baderna/Flood.} - 11 Jan 2023 - 11 Jan 2026
* NinaDobrev!! [DME] {Baderna/Flood.} - 11 Jan 2023 - 11 Jan 2026
* !=naty=! [DME] {Ataque de Negociações/Baderna.} - 11 Jan 2023 - 11 Jan 2026
* ..:Matriex:..: [DME] {Falsificação/Estelionato.} - 11 Jan 2023 - 11 Jan 2026
* bad4pixxel [DME] {Baderna/Flood.} - 11 Jan 2023 - 11 Jan 2026
* deivyd516 [DME] {Tentativa de Golpe/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* teiroanjo [DME] {Ameaça.} - 11 Jan 2023 - 11 Jan 2026
* DawFake [DME] {Terrorismo.} - 11 Jan 2023 - 11 Jan 2026
* KauanDBV [DME] {Acesso duplo/Falsificação/Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* ,Inaceitavel- [DME] {Baderna/Fake.} - 11 Jan 2023 - 11 Jan 2026
* ser18p5-9 [DME] {Baderna/Fake.} - 11 Jan 2023 - 11 Jan 2026
* Abobbador [DME] {Acesso indevido/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* Lukinhas_yahnoh [DME] {Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* Ayfy [DME] {Fake de exonerado (Abobbador).} - 11 Jan 2023 - 11 Jan 2026
* Equivalencia [DME] {Fake de exonerado (Abobbador).} - 11 Jan 2023 - 11 Jan 2026
* reieusouten [DME] {Fake de exonerado (Abobbador).} - 11 Jan 2023 - 11 Jan 2026
* umsoldadoguerre [DME] {Baderna.} - 11 Jan 2023 - 11 Jan 2026
* dakin910 [DME] {Baderna.} - 11 Jan 2023 - 11 Jan 2026
* guilhermegive [DME] {Difamação/Baderna.} - 11 Jan 2023 - 11 Jan 2026
* -amendoim- [DME] {Racismo/Baderna.} - 11 Jan 2023 - 11 Jan 2026
* TonyDark36 [DME] {Conduta imprópria/Difamação/Acusação sem provas.} - 11 Jan 2023 - 11 Jan 2026
* Rude-. [DME] {Conduta Imprópria/Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* OdioPurissimo [DME] {Conduta imprópria/Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* MauriPolicial [DME] {Tentativa de invasão/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* arthurabcdef [DME] {Tentativa de invasão/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* vitinhsm200 [DME] {Tentativa de invasão/Falsificação.} - 11 Jan 2023 - 11 Jan 2026
* Udib1 [DME] {Baderna.} - 11 Jan 2023 - 11 Jan 2026
* Phillipe.ba [DME] {Reincidência de crimes.} - 11 Jan 2023 - 01 Jan 2030
* dyddgh [DME] {Falsificação de Patente/Provas.} - 11 Jan 2023 - 11 Jan 2026
* GTE [DME] {Baderna/Flood.} - 11 Jan 2023 - 11 Jan 2026
* _Miutin_ [DME] {Preconceito e Discriminação/Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* _Arabiano_ [DME] {Fake de exonerado _Miutin_.} - 11 Jan 2023 - 11 Jan 2026
* cotonette [DME] {Desrespeito.} - 11 Jan 2023 - 11 Jan 2026
* Papaleguas_ [DME] {Fake de exonerado cotonette.} - 11 Jan 2023 - 11 Jan 2026
* wzy, [DME] {Assédio.} - 11 Jan 2023 - 11 Jan 2026
* MegaDoAkon [DME] {Desrespeito/Baderna.} - 11 Jan 2023 - 11 Jan 2026
* Amendoinna [DME] {Acesso Indevido/Baderna.} - 11 Jan 2023 - 11 Jan 2026
* Miutin. [DME] {Fake do exonerado _Miutin_.} - 11 Jan 2023 - 11 Jan 2026
* Xarmozinha [DME] {Fake do exonerado _Miutin_.} - 11 Jan 2023 - 11 Jan 2026
* SKOTT [Frn] {Acesso duplo.} - 30 Jan 2023 - 30 Jan 2026
* Ckt [Frn] {Fake de exonerado SKOTT} - 30 Jan 2023 - 30 Jan 2026
* Wakf [Frn] {Fake de exonerado SKOTT} - 30 Jan 2023 - 30 Jan 2026
* SocaFofo [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* RainhaCookie [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* leo-mirins [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* Bernardo_b. [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* Mia.G [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* Danielpi2 [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* Howz [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* p3gasus_ [AqF] {Terrorismo.} - 27 Feb 2023 - 27 Feb 2033
* brunoleonny. [AqF] {Terrorismo.} - 28 Feb 2023 - 28 Sep 2028
* Notorious-. [AqF] {Acesso duplo.} - 03 Mar 2023 - 30 Jan 2030
* SupremeBlack [AqF] {Acesso duplo.} - 03 Mar 2023 - 30 Jan 2030
* GeovannaLais7 [AqF] {Acesso duplo.} - 12 Mar 2023 - 20 Feb 2040
* yankyss [AqF] {Acesso duplo.} - 12 Mar 2023 - 20 Feb 2040
* Doutorestilo [AqF] {Terrorismo.} - 26 Mar 2023 - 26 Mar 2050
* ASDP [AqF] {Terrorismo.} - 26 Mar 2023 - 26 Mar 2050
* Paulo1006 [AqF] {Terrorismo.} - 26 Mar 2023 - 26 Mar 2050
* IsmaelTorres [AqF] {Terrorismo.} - 26 Mar 2023 - 26 Mar 2050
* Lukas..Oculto [AqF] {Terrosimo.} - 26 Mar 2023 - 26 Mar 2050
* .:Dr.Neck:. [AqF] {Terrorismo.} - 26 Mar 2023 - 26 Mar 2050
* ,iToxic [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* Segu.Ricos-BAN [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* Viton.Oculto [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* Voided [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* Synthblade [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* 616 [AqF] {Terrorismo.} - 01 Apr 2023 - 01 Apr 2050
* Ser53041 [pkb] {Terrorismo.} - 06 Apr 2023 - 06 Apr 2050
* StyleWhite [AqF] {Desrespeito/Conduta Imprópria.} - 21 Jun 2023 - 21 Jun 2030
* DarkBooo [pkb] {Terrorismo.} - 12 Jul 2023 - 12 Jul 2050
* _God, [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* Andzin [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* Miguel_Morais77 [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* ruanhop@ [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* ._KayDefault_. [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* Mellisa.L [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* Riopsz-BAN [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* martimribeiro45 [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* Sociedade_ASA [pkb] {Terrorismo.} - 13 Jul 2023 - 13 Jul 2050
* j619 [AqF] {Artemi} - 13 Aug 2023 - 13 Oct 2050
* tenebrosoofc [CmD] {Difamação, conduta imprópria e fake.} - 07 Sep 2023 - 30 Apr 2027
* Deth..Ismigol.. [pkb] {Associação criminosa e terrorismo.} - 12 Sep 2023 - 12 Sep 2050
* Vingador__ [Ore] {Conduta imprópria / Desrespeito} - 17 Oct 2023 - 17 Oct 2025
* Eusouvoce11 [Ore] {Fake do exonerado Vingador__ / Desrespeito} - 17 Oct 2023 - 17 Oct 2025
* amomorangos [Ore] {Fake do Vingador__ baderna e desrespeito.} - 17 Oct 2023 - 17 Oct 2025
* _6Queijos [JTP] {Fake de exonerado 7Queiiijos} - 28 Nov 2023 - 10 Jan 2028
* Rtnz [RCV] {Racismo.} - 13 Jan 2024 - 13 Jan 2034
* NewFleks [VAR] {Racismo} - 25 Jan 2024 - 25 Jan 2026
* Fabbri [Hox] {Divulgação de informações pessoais - ARTM} - 08 Feb 2024 - 08 Feb 3024
* @BOLSONARINHO@ [KvM] {Racismo.} - 02 Mar 2024 - 02 Mar 2034
* Davy10911 [Arc] {Xenofobia} - 10 Mar 2024 - 10 Mar 2029
* ser7-u131 [Arc] {Ameaça.} - 27 Apr 2024 - 27 Apr 2026
* ..-Danoninho-.. [Arc] {Homofobia} - 01 Jun 2024 - 01 Jun 2030
* ser4-b149 [Arc] {Ameaça.} - 08 Jun 2024 - 08 Jun 2050
* nhoquezinho [Arc] {Ameaça.} - 08 Jun 2024 - 08 Jun 2050
* SR.ODISSEU [Arc] {Ameaça} - 08 Jun 2024 - 08 Jun 2050
* jefers0nsilv4 [Arc] {Falsa Identidade} - 11 Jun 2024 - 11 Jun 2050
* Magnetico:. [VAR] {Estelionato e Corrupção - ARTM} - 09 Jul 2024 - 09 Jul 2027
* Alva [VAR] {Estelionato e Corrupção - ARTM} - 09 Jul 2024 - 09 Jul 2027
* Miihks:. [VAR] {Estelionato e Corrupção - ARTM} - 09 Jul 2024 - 09 Jul 2027
* :gabriel@: [VAR] {Estelionato e Corrupção - ARTM} - 09 Jul 2024 - 09 Jul 2027
* Charlison [BrA] {Insubordinação / Desrespeito.} - 13 Aug 2024 - 13 Dec 2028
* wenderhepp [BrA] {Insubordinação / Desrespeito.} - 13 Aug 2024 - 15 May 2028
* -CounterStrike [BrA] {Fake de exonerado - wenderhepp} - 14 Aug 2024 - 15 May 2028
* -Trakinas.Ban- [BrA] {Fake de wenderhepp} - 14 Aug 2024 - 15 May 2028
* LeskHit [BrA] {Fake de wenderhepp} - 14 Aug 2024 - 14 May 2030
* wender09 [BrA] {Fake de wenderhepp} - 14 Aug 2024 - 15 May 2028
* 0PoderosoChefao [BrA] {Fake de wenderhepp} - 14 Aug 2024 - 15 May 2028
* Tuppers. [BrA] {Fake de wenderhepp} - 14 Aug 2024 - 15 May 2028
* Jvitinn78.2 [JTP] {Estelionato.} - 28 Aug 2024 - 31 Dec 2026
* ivanilda520 [VAR] {Machismo/Assédio.} - 07 Sep 2024 - 07 Dec 2026
* Coyyote [VAR] {Reincidência de crimes.} - 10 Sep 2024 - 10 Sep 2025
* LordDOPteamo [VAR] {Fake de exonerado - ivanilda520} - 15 Sep 2024 - 07 Dec 2026
* Prouny [VAR] {Reincidência de crimes} - 19 Sep 2024 - 19 Sep 2025
* Yekaterina [VAR] {Reincidência de crimes} - 05 Oct 2024 - 05 Oct 2025
* Quelvinhoo [VAR] {Reincidência de crimes} - 06 Oct 2024 - 06 Oct 2025
* Maralky [VAR] {Reincidência de crimes} - 18 Oct 2024 - 18 Oct 2025
* Imutavel [Hox] {Terrorismo / Fake de ,iToxic} - 21 Oct 2024 - 01 Apr 2050
* fmiidi [FME] {Plágio e comprometimento de sistemas - ARTM} - 24 Oct 2024 - 01 Apr 2050
* greccoromany02 [VAR] {Reincidência de crimes} - 07 Nov 2024 - 05 Nov 2025
* dudamist [JTP] {Difamação} - 06 Jan 2025 - 05 Jun 2035
* nebolosa15 [VAR] {Reincidência de crimes} - 03 Feb 2025 - 03 Feb 2026
* MatheusDESTY [VAR] {Estelionato} - 07 Feb 2025 - 07 Feb 2030
* ser2-d913 [VAR] {Reincidência de crimes} - 14 Feb 2025 - 14 Feb 2026
* DomadorLT [Ore] {Desrespeito, conduta imprópria e assédio.} - 16 Mar 2025 - 16 Mar 2026
* Ceft-BAN [JTP] {Estelionato} - 20 Mar 2025 - 20 Mar 2030
* -_-HABBO-_- [VAR] {Reincidência de crimes} - 21 Mar 2025 - 01 Jan 2026
* =Chocolata@ [VAR] {Reincidência de crimes} - 29 Mar 2025 - 29 Mar 2026
* Intoxica! [VAR] {Reincidência de crimes} - 04 Apr 2025 - 04 Apr 2026
* BRADOCK:. [Kev] {Estelionato.} - 04 May 2025 - 04 Sep 2025
* ZicoLeyenda [Kev] {Conduta imprópria, insubordinação e baderna.} - 29 May 2025 - 29 Nov 2025
* drwx---r-x [Ska] {Ataques e Importunação - ARTM} - 30 May 2025 - 30 May 2050
* Bellatrix. [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* slauseless [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* Xubangotango [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* 5cientia [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* farra!== [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* j!raiya [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* curticao== [Ska] {Fake de drwx---r-x} - 30 May 2025 - 30 May 2050
* Beta-Alanina [CmD] {Reincidência do crime de traição} - 06 Jun 2025 - 07 Oct 2026
* Beta-Ala.BAN [CmD] {Conta secundária do Beta-Alanina} - 06 Jun 2025 - 07 Oct 2026
* Rafinhamusgo [FdK] {Reincidência do crime de traição} - 22 Jun 2025 - 22 Jun 2026
* Carlota265 [Sam] {Acesso duplo} - 24 Jun 2025 - 24 Jun 2026
* Hellena1 [Sam] {Acesso duplo} - 24 Jun 2025 - 24 Jun 2026
* Carlota265.BAN [Sam] {Fake de exonerado - Carlota265} - 24 Jun 2025 - 24 Jun 2026
* Sargento.Gomes [VAR] {Reincidência de crimes} - 19 Jul 2025 - 01 Jan 2026
* Mhys [VAR] {Reincidência de crimes} - 19 Jul 2025 - 01 Jan 2026
* -:Mr.Money:- [Ska] {Difamação/Desrespeito} - 23 Jul 2025 - 23 Jul 2028
* onlyd4awns [Ore] {Desrespeito.} - 09 Aug 2025 - 10 Dec 2025
* Miven [FME] {Terrorismo - ARTM} - 26 Aug 2025 - 26 Aug 2030
* .Brendon [FME] {Terrorismo - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Sr.PowerDOE [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Handrielly46- [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* @Gabii008 [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Emanuellnerd00 [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* CVitorê [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* caboluis [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* rodr1guess [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Piinguim [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* -:gUaRaNa:- [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Flint.Graham [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* rafael68196 [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* LucasPaulo. [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* Dayvid.Santos [FME] {Listagem de Exonerados - ARTM} - 26 Aug 2025 - 26 Aug 2030
* matmallosTIAGO [BrA] {Desrespeito.} - 07 Oct 2025 - 07 Dec 2060
* jhonzinhofluxo [Sam] {Conduta Imprópria, Insubordinação, Desrespeito e Crime contra a Honra.} - 24 Oct 2025 - 24 Oct 2026
* Vk.77 [RCV] {Plágio.} - 17 Dec 2025 - 17 Dec 2028
* lusin [RCV] {Plágio.} - 17 Dec 2025 - 17 Dec 2028
* Mystrix [RCV] {Plágio.} - 17 Dec 2025 - 17 Dec 2028
* Starmind [RCV] {Plágio.} - 17 Dec 2025 - 17 Dec 2028
* L.K. [RCV] {Plágio.} - 17 Dec 2025 - 17 Dec 2028
* Isaqueduarte095 [RCV] {Plágio.} - 18 Dec 2025 - 18 Dec 2028
* draxys [OpT] {Conduta imprória e Desrespeito.} - 14 Jan 2026 - 14 Apr 2026
* Anjo! [RCV] {Desrespeito e difamação.} - 17 Jan 2026 - 17 Apr 2026
* kidsp1 [Pud] {Desrespeito e conduta imprópria!} - 19 Jan 2026 - 19 Jan 2027
* _overthinking [lim] {Fake de drwx---r-x} - 20 Jan 2026 - 30 Jan 2050
* GaitaDivina [OpT] {Conduta imprópria, Desrespeito e Difamação.} - 25 Jan 2026 - 25 Jan 2027
* teteusafadin [OpT] {Desrespeito.} - 01 Feb 2026 - 01 Feb 2028
* ComandanteDME. [Arc] {Assédio.} - 12 Feb 2026 - 12 Feb 2050
* nfherbe [Arc] {Falsificação} - 22 Feb 2026 - 22 Feb 2030
* FredericoVerde [Arc] {Falsificação} - 22 Feb 2026 - 22 Feb 2030
* fernando16o [lim] {Exonerado por Preconceito e Discriminação. Provas em posse da ABIN.} - 22 Feb 2026 - 29 Dec 2028
* mariimacedo [RCV] {Racismo.} - 27 Feb 2026 - 27 Feb 2040
* MarrcinhoVP2 [Pud] {Desrespeito e conduta imprópria.} - 28 Feb 2026 - 28 Feb 2027
* pledenton [Arc] {Racismo} - 05 Mar 2026 - 05 Mar 2030
* Acid.Good [Nil] {Reincidência de crimes.} - 10 Mar 2026 - 10 Jan 2027
* ImpetusPoetae [Arc] {Baderna.} - 24 Mar 2026 - 24 Mar 2027
* gabriel842124 [Arc] {Flood e Baderna.} - 24 Mar 2026 - 27 Mar 2027
* LiizMacedo [Sam] {Fake de exonerado - mariimacedo} - 01 Apr 2026 - 27 Feb 2040
* LoveGatinha21 [Sam] {Reincidência de crime.} - 05 Apr 2026 - 06 Oct 2026
* ::Yoko:: [Sam] {Baderna e desrespeito} - 08 Apr 2026 - 08 Apr 2027
* atkbesport [Sam] {Baderna e desrespeito} - 08 Apr 2026 - 08 Apr 2027
* Christina-s2 [VAR] {Acesso duplo/Estelionato} - 21 Apr 2026 - 21 Oct 2026
* ReginaPhalange@ [VAR] {Fake de exonerado - Christina-s2} - 21 Apr 2026 - 21 Oct 2026
* Rusbed [VAR] {Fake de exonerado - Christina-s2} - 21 Apr 2026 - 21 Oct 2026
* Billidjin [VAR] {Fake de exonerado - Christina-s2} - 21 Apr 2026 - 21 Oct 2026
* ser-8c570 [VAR] {Fake de exonerado - Christina-s2} - 21 Apr 2026 - 21 Oct 2026
* EminemEMariah [VAR] {Fake de exonerado - Christina-s2} - 21 Apr 2026 - 21 Oct 2026
"""


def parse_date(day: str, month_str: str, year: str) -> date:
    m = _MONTHS.get(month_str)
    if not m:
        raise ValueError(f"Unknown month: {month_str!r}")
    y = int(year)
    if y > 9999:
        y = 9999
    return date(y, m, int(day))


def parse_entries():
    seen = set()
    entries = []
    for m in _RE.finditer(_RAW):
        nick, tag, motivo, d1, mon1, y1, d2, mon2, y2 = m.groups()
        if nick in seen:
            continue
        seen.add(nick)
        try:
            dt_inicio = parse_date(d1, mon1, y1)
            dt_fim    = parse_date(d2, mon2, y2)
        except ValueError as e:
            print(f"Skipping {nick!r}: {e}")
            continue
        entries.append((nick, tag, motivo, dt_inicio, dt_fim))
    return entries


def main():
    entries = parse_entries()
    print(f"Parsed {len(entries)} exonerados.")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for nick, tag, motivo, dt_inicio, dt_fim in entries:
                cur.execute(
                    """
                    INSERT INTO exonerados (nick, tag, motivo, data_inicio, data_fim)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (nick) DO UPDATE SET
                        tag         = EXCLUDED.tag,
                        motivo      = EXCLUDED.motivo,
                        data_inicio = EXCLUDED.data_inicio,
                        data_fim    = EXCLUDED.data_fim
                    """,
                    (nick, tag, motivo, dt_inicio, dt_fim),
                )
        conn.commit()
    print(f"OK: {len(entries)} exonerados importados.")


if __name__ == "__main__":
    main()

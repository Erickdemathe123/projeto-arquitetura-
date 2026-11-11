<script>
import { SCREEN_TITLES } from "./constants/screens";
import { emptyExamForm, emptyQuestionForm, examFormFrom, questionFormFrom } from "./utils/forms";
import { authApi, questoesApi, turmasApi, avaliacoesApi, resultadosApi, isAuthenticated } from "./services/api";
import AuthScreen from "./components/AuthScreen.vue";
import StudentPortal from "./components/StudentPortal.vue";
import AppSidebar from "./components/AppSidebar.vue";
import AppTopbar from "./components/AppTopbar.vue";
import DashboardScreen from "./components/DashboardScreen.vue";
import ClassesScreen from "./components/ClassesScreen.vue";
import QuestionsScreen from "./components/QuestionsScreen.vue";
import QuestionForm from "./components/QuestionForm.vue";
import ExamsScreen from "./components/ExamsScreen.vue";
import ExamForm from "./components/ExamForm.vue";
import ExamPreview from "./components/ExamPreview.vue";
import StatisticsScreen from "./components/StatisticsScreen.vue";
import ScanScreen from "./components/ScanScreen.vue";

export default {
  components: {
    AuthScreen,
    StudentPortal,
    AppSidebar,
    AppTopbar,
    DashboardScreen,
    ClassesScreen,
    QuestionsScreen,
    QuestionForm,
    ExamsScreen,
    ExamForm,
    ExamPreview,
    StatisticsScreen,
    ScanScreen
  },
  data() {
    return {
      screen: "login",
      mode: "login",
      name: "",
      email: "",
      password: "",
      confirmation: "",
      error: "",
      message: "",
      toast: "",
      loadingAuth: false,
      loadingWorkspace: false,
      currentUser: null,
      questions: [],
      exams: [],
      turmas: [],
      turmaForm: { name: "" },
      alunoForm: { name: "", ra: "" },
      selectedTurmaId: null,
      editingQuestionId: null,
      editingExamId: null,
      editingQuestionFromExam: false,
      questionForm: emptyQuestionForm(),
      examForm: emptyExamForm(),
      previewExam: null,
      studentCode: "",
      studentRa: "",
      consultedExam: null,
      scanStep: "list",
      scanLoading: false,
      scanSummaries: {},
      scanActiveExam: null,
      scanForm: { ra: "", score: "" },
    };
  },
  computed: {
    currentTitle() {
      return SCREEN_TITLES[this.screen];
    },
    selectedTurma() {
      return this.turmas.find((turma) => turma.id === this.selectedTurmaId) || null;
    },
    studentLookupStatus() {
      if (!this.consultedExam) return "";
      return this.consultedExam.released ? "released" : "blocked";
    },
    availableSubjects() {
      return [...new Set(this.questions.map((question) => question.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    },
    availableClasses() {
      return [...new Set(this.turmas.map((turma) => turma.name).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    },
    examsForScan() {
      return this.exams.filter((exam) => exam.applicationClassId);
    }
  },
  watch: {
    "examForm.subject"(newSubject, oldSubject) {
      if (newSubject === oldSubject) return;
      this.examForm.selected = this.examForm.selected.filter((questionId) => {
        const question = this.questions.find((item) => item.id === questionId);
        return question && question.subject === newSubject;
      });
    }
  },
  async mounted() {
    window.addEventListener("popstate", this.handleRouteChange);
    const studentRoute = this.isStudentPortalRoute();
    if (isAuthenticated()) {
      try {
        const user = await authApi.me();
        if (user && user.email) {
          this.currentUser = user;
          this.name = user.name;
          this.email = user.email;
          await this.loadWorkspace();
        }
      } catch (erro) {
        console.error("Não foi possível carregar a sessão:", erro.message);
        if (erro.status === 401) authApi.logout();
        this.error = "Não foi possível carregar seus dados do servidor. Tente novamente.";
      }
    }
    if (studentRoute) this.openStudentPortal({ updateUrl: false });
  },
  beforeUnmount() {
    window.removeEventListener("popstate", this.handleRouteChange);
  },
  methods: {
    switchMode() {
      this.mode = this.mode === "login" ? "register" : "login";
      this.error = "";
      this.message = "";
    },
    async submitAuth() {
      this.error = "";
      this.message = "";
      if (this.mode === "register" && !this.name.trim()) return (this.error = "Informe seu nome completo.");
      if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) return (this.error = "Digite um e-mail válido.");
      if (this.password.length < 6) return (this.error = "A senha deve ter pelo menos 6 caracteres.");
      if (this.mode === "register" && this.password !== this.confirmation) return (this.error = "As senhas não coincidem.");

      try {
        this.loadingAuth = true;
        if (this.mode === "register") {
          const res = await authApi.cadastro({
            nome: this.name.trim(),
            email: this.email.trim(),
            senha: this.password,
            role: "professor"
          });
          this.currentUser = res.usuario;
          this.message = "Conta criada com sucesso!";
        } else {
          const res = await authApi.login({
            email: this.email.trim(),
            senha: this.password
          });
          this.currentUser = res.usuario;
          this.name = res.usuario.name;
          this.message = "Login realizado com sucesso.";
        }
        await this.loadWorkspace();
      } catch (erro) {
        // Erros de negócio da API (400, 401, 409) são exibidos diretamente ao usuário
        if (erro.status === 400 || erro.status === 401 || erro.status === 409) {
          this.error = erro.message;
          return;
        }
        console.error("Falha na API de autenticação:", erro.message);
        this.error = erro.status ? erro.message : "Não foi possível conectar ao servidor. Tente novamente.";
      } finally {
        this.loadingAuth = false;
      }
    },
    async loadWorkspace() {
      this.loadingWorkspace = true;
      this.error = "";
      try {
        const [questions, turmas, exams] = await Promise.all([
          questoesApi.listar(),
          turmasApi.listar(),
          avaliacoesApi.listar()
        ]);
        this.name = this.currentUser?.name || this.name;
        this.questions = questions;
        this.turmas = await Promise.all(turmas.map(async (turma) => {
          const students = await turmasApi.listarAlunos(turma.id);
          const mappedStudents = students.map((aluno) => ({
            id: Number(aluno.id),
            name: aluno.nome,
            ra: aluno.ra
          }));
          return {
            id: Number(turma.id),
            name: turma.nome,
            description: turma.descricao,
            inviteCode: turma.codigoConvite,
            archived: turma.arquivada,
            studentCount: mappedStudents.length,
            students: mappedStudents
          };
        }));
        this.exams = exams;
        this.screen = "dashboard";
      } catch (erro) {
        this.error = erro.status ? erro.message : "Não foi possível carregar os dados do servidor.";
        throw erro;
      } finally {
        this.loadingWorkspace = false;
      }
    },
    navigate(screen) {
      this.screen = screen;
      this.error = "";
    },
    logout() {
      authApi.logout();
      this.currentUser = null;
      this.screen = "login";
      this.mode = "login";
      this.password = "";
      this.confirmation = "";
      this.message = "";
      this.questions = [];
      this.exams = [];
      this.turmas = [];
    },
    mapearAluno(aluno) {
      return { id: aluno.id, name: aluno.nome, ra: aluno.ra };
    },
    mapearTurma(turma, alunos = []) {
      return {
        id: turma.id,
        name: turma.nome,
        description: turma.descricao,
        inviteCode: turma.codigoConvite,
        archived: turma.arquivada,
        studentCount: alunos.length,
        students: alunos.map((aluno) => this.mapearAluno(aluno))
      };
    },
    async recarregarAlunos(turma) {
      const alunos = await turmasApi.listarAlunos(turma.id);
      turma.students = alunos.map((aluno) => this.mapearAluno(aluno));
      turma.studentCount = turma.students.length;
    },
    async saveTurma() {
      const nome = this.turmaForm.name.trim();
      if (!nome) return (this.error = "Informe o nome da turma.");
      try {
        const turma = await turmasApi.criar({ nome });
        this.turmas.push(this.mapearTurma(turma));
        this.turmas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
        this.turmaForm = { name: "" };
        this.error = "";
        this.notify("Turma criada com sucesso.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async openTurma(turma) {
      this.selectedTurmaId = turma.id;
      this.alunoForm = { name: "", ra: "" };
      this.error = "";
      try {
        const alunos = await turmasApi.listarAlunos(turma.id);
        turma.students = alunos.map((aluno) => ({
          ...this.mapearAluno(aluno)
        }));
        turma.studentCount = turma.students.length;
      } catch (erro) {
        this.error = erro.message;
      }
    },
    closeTurma() {
      this.selectedTurmaId = null;
      this.alunoForm = { name: "", ra: "" };
      this.error = "";
    },
        async editTurma(turma) {
      const novoNome = window.prompt("Novo nome da turma:", turma.name);
      if (novoNome === null) return;
      const nome = novoNome.trim();
      if (!nome) return (this.error = "Informe o nome da turma.");
      if (nome === turma.name) return;
      try {
        const atualizada = await turmasApi.editar(turma.id, { nome });
        turma.name = (atualizada && atualizada.nome) || nome;
        this.turmas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
        this.error = "";
        this.notify("Turma atualizada com sucesso.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    // A API não apaga turmas: arquiva, para preservar o histórico de provas aplicadas
    async removeTurma(turma) {
      if (!window.confirm(`Arquivar a turma "${turma.name}"? Ela deixará de aparecer na lista.`)) return;
      try {
        await turmasApi.arquivar(turma.id);
        this.turmas = this.turmas.filter((item) => item.id !== turma.id);
        if (this.selectedTurmaId === turma.id) this.closeTurma();
        this.notify("Turma arquivada.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async saveAluno() {
      const turma = this.selectedTurma;
      if (!turma) return;
      const nome = this.alunoForm.name.trim();
      const ra = this.alunoForm.ra.trim();
      if (!nome || !ra) return (this.error = "Informe o nome e o RA do aluno.");
      try {
        const aluno = await turmasApi.matricular(turma.id, { nome, ra });
        turma.students.push(this.mapearAluno(aluno));
        turma.students.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
        turma.studentCount = turma.students.length;
        this.alunoForm = { name: "", ra: "" };
        this.error = "";
        this.notify("Aluno cadastrado com sucesso.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async removeAluno(aluno) {
      const turma = this.selectedTurma;
      if (!turma) return;
      try {
        await turmasApi.removerAluno(turma.id, aluno.id);
        turma.students = turma.students.filter((item) => item.id !== aluno.id);
        turma.studentCount = turma.students.length;
        this.error = "";
        this.notify("Aluno removido da turma.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async saveQuestion() {
      const form = this.questionForm;
      if (!form.text.trim() || !form.subject.trim() || !form.topic.trim()) return (this.error = "Preencha o enunciado, a disciplina e o assunto.");
      if (form.alternatives.some((alternative) => !alternative.trim())) return (this.error = "Preencha todas as alternativas.");
      const wasEditing = Boolean(this.editingQuestionId);
      const returnToExam = this.editingQuestionFromExam;
      try {
        const payload = {
          text: form.text.trim(),
          subject: form.subject.trim(),
          topic: form.topic.trim(),
          alternatives: [...form.alternatives],
          correctAlternative: form.correctAlternative
        };
        const question = this.editingQuestionId
          ? await questoesApi.editar(this.editingQuestionId, payload)
          : await questoesApi.criar(payload);
        if (this.editingQuestionId) {
          const questionIndex = this.questions.findIndex((item) => item.id === this.editingQuestionId);
          this.questions.splice(questionIndex, 1, question);
        } else {
          this.questions.push(question);
        }
        this.questionForm = emptyQuestionForm();
        this.editingQuestionId = null;
        this.editingQuestionFromExam = false;
        this.notify(wasEditing ? "Questão atualizada com sucesso." : "Questão cadastrada com sucesso.");
        this.navigate(returnToExam ? "newExam" : "questions");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    editQuestion(question) {
      this.editingQuestionId = question.id;
      this.editingQuestionFromExam = false;
      this.questionForm = questionFormFrom(question);
      this.navigate("newQuestion");
    },
    editQuestionFromExam(question) {
      this.editingQuestionId = question.id;
      this.editingQuestionFromExam = true;
      this.questionForm = questionFormFrom(question);
      this.navigate("newQuestion");
    },
    cancelQuestionEdit() {
      const returnToExam = this.editingQuestionFromExam;
      this.editingQuestionId = null;
      this.editingQuestionFromExam = false;
      this.navigate(returnToExam ? "newExam" : "questions");
    },
    async removeQuestion(question) {
      try {
        await questoesApi.remover(question.id);
        this.questions = this.questions.filter((item) => item.id !== question.id);
        this.notify("Questão removida.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async saveExam() {
      if (!this.examForm.name.trim()) return (this.error = "Informe o nome da avaliação.");
      if (!this.examForm.selected.length) return (this.error = "Selecione ao menos uma questão.");
      const questionPoints = this.examForm.selected.map((questionId) => Number(this.examForm.points[questionId]));
      if (questionPoints.some((points) => !(points > 0))) return (this.error = "Informe uma pontuação maior que zero para cada questão selecionada.");
      const wasEditing = Boolean(this.editingExamId);
      const selectedClass = this.turmas.find((turma) => turma.name === this.examForm.className);
      const { points, ...examFields } = this.examForm;
      const payload = {
        ...examFields,
        name: this.examForm.name.trim(),
        questionIds: [...this.examForm.selected],
        questionPoints,
        applicationClassId: selectedClass ? selectedClass.id : null
      };
      try {
        const exam = this.editingExamId
          ? await avaliacoesApi.editar(this.editingExamId, payload)
          : await avaliacoesApi.criar(payload);
        if (wasEditing) {
          const index = this.exams.findIndex((item) => item.id === this.editingExamId);
          this.exams.splice(index, 1, exam);
        } else {
          this.exams.unshift(exam);
        }
        this.examForm = emptyExamForm();
        this.editingExamId = null;
        this.notify(wasEditing ? "Avaliação atualizada com sucesso." : "Avaliação criada com sucesso.");
        this.navigate("exams");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    editExam(exam) {
      this.editingExamId = exam.id;
      this.examForm = examFormFrom(exam);
      this.navigate("newExam");
    },
    async removeExam(exam) {
      try {
        await avaliacoesApi.remover(exam.id);
        this.exams = this.exams.filter((item) => item.id !== exam.id);
        this.notify("Avaliação removida.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async releaseExam(exam) {
      try {
        const updated = await avaliacoesApi.liberarGabarito(exam.id, !exam.released);
        Object.assign(exam, updated);
        this.notify(exam.released ? "Gabarito liberado para consulta." : "Gabarito bloqueado para consulta.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async consultStudentResult() {
      const code = this.studentCode.trim().toUpperCase();
      const ra = this.studentRa.trim();
      if (!ra) {
        this.consultedExam = null;
        this.error = "Informe também o seu RA.";
        return;
      }
      try {
        this.consultedExam = await avaliacoesApi.consultarCodigo(code, ra);
        this.error = "";
      } catch (erro) {
        this.consultedExam = null;
        this.error = erro.message;
      }
    },
    isStudentPortalRoute() {
      const { pathname, hash } = window.location;
      return /^\/aluno\/?$/.test(pathname) || /^#\/?aluno\/?$/.test(hash);
    },
    handleRouteChange() {
      if (this.isStudentPortalRoute()) {
        this.openStudentPortal({ updateUrl: false });
      } else if (this.screen === "studentPortal") {
        this.leaveStudentPortal({ updateUrl: false });
      }
    },
    openStudentPortal({ updateUrl = true } = {}) {
      // O código pode vir na URL (ex.: /aluno?codigo=SGP-ABC123), para uso futuro no QR/impressão
      const codeFromUrl = new URLSearchParams(window.location.search).get("codigo");
      this.studentCode = codeFromUrl ? codeFromUrl.trim().toUpperCase() : "";
      this.studentRa = "";
      this.consultedExam = null;
      this.error = "";
      this.message = "";
      this.screen = "studentPortal";
      if (updateUrl && !this.isStudentPortalRoute()) window.history.pushState(null, "", "/aluno");
    },
    leaveStudentPortal({ updateUrl = true } = {}) {
      this.studentCode = "";
      this.studentRa = "";
      this.consultedExam = null;
      this.error = "";
      if (updateUrl && this.isStudentPortalRoute()) window.history.pushState(null, "", "/");
      if (this.currentUser) {
        this.screen = "dashboard";
      } else {
        this.mode = "login";
        this.screen = "login";
      }
    },
    previewExamForm() {
      this.previewExam = {
        ...this.examForm,
        questionIds: [...this.examForm.selected],
        createdAt: new Date().toLocaleDateString("pt-BR")
      };
      this.navigate("preview");
    },
    previewSavedExam(exam) {
      this.previewExam = exam;
      this.navigate("preview");
    },
    openStatistics() {
      this.notify("Estatísticas indisponíveis: ainda não há respostas de avaliações persistidas.");
    },
    async openScan() {
      this.scanStep = "list";
      this.scanActiveExam = null;
      this.navigate("scan");
      await this.loadScanSummaries();
    },
    async loadScanSummaries() {
      this.scanLoading = true;
      try {
        const entries = await Promise.all(
          this.examsForScan.map(async (exam) => [exam.id, await resultadosApi.listar(exam.id)])
        );
        this.scanSummaries = Object.fromEntries(entries);
      } catch (erro) {
        this.error = erro.message;
      } finally {
        this.scanLoading = false;
      }
    },
    openScanExam(exam) {
      this.scanActiveExam = exam;
      this.scanForm = { ra: "", score: "" };
      this.error = "";
      this.scanStep = "form";
    },
    backToScanList() {
      this.scanStep = "list";
      this.scanActiveExam = null;
    },
    async submitScanResult() {
      if (!this.scanActiveExam) return;
      this.error = "";
      try {
        const resultado = await resultadosApi.registrar(this.scanActiveExam.id, this.scanForm);
        this.scanSummaries[this.scanActiveExam.id] = await resultadosApi.listar(this.scanActiveExam.id);
        this.scanForm = { ra: "", score: "" };
        this.notify(`Nota registrada para ${resultado.studentName}.`);
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async removeScanResult(resultado) {
      if (!this.scanActiveExam) return;
      try {
        await resultadosApi.remover(this.scanActiveExam.id, resultado.studentId);
        this.scanSummaries[this.scanActiveExam.id] = await resultadosApi.listar(this.scanActiveExam.id);
        this.notify("Nota removida.");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    async importStudents(event) {
      const [file] = event.target.files;
      event.target.value = "";
      const turma = this.selectedTurma;
      if (!file || !turma) return;
      try {
        const conteudo = await file.text();
        const resultado = await turmasApi.importarCsv(turma.id, conteudo);
        await this.recarregarAlunos(turma);
        const partes = [`${resultado.matriculados.length} aluno(s) importado(s)`];
        if (resultado.jaMatriculados.length) partes.push(`${resultado.jaMatriculados.length} já estava(m) na turma`);
        if (resultado.erros.length) partes.push(`${resultado.erros.length} linha(s) com erro`);
        this.notify(`${partes.join(", ")}.`);
        this.error = resultado.erros.map((item) => `Linha ${item.linha}: ${item.motivo}`).join(" ");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    notify(text) {
      this.toast = text;
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => { this.toast = ""; }, 3000);
    }
  }
}
</script>

<template>
  <AuthScreen
    v-if="screen === 'login' || screen === 'register'"
    :mode="mode"
    v-model:name="name"
    v-model:email="email"
    v-model:password="password"
    v-model:confirmation="confirmation"
    :error="error"
    :message="message"
    :loading="loadingAuth"
    @submit="submitAuth"
    @switch-mode="switchMode"
    @open-student-portal="openStudentPortal()"
  />
  <StudentPortal
    v-else-if="screen === 'studentPortal'"
    v-model:code="studentCode"
    v-model:ra="studentRa"
    :result="consultedExam"
    :error="error"
    @consult="consultStudentResult"
    @back="leaveStudentPortal()"
  />
  <div v-else class="app-shell">
    <AppSidebar
      :screen="screen"
      @navigate="navigate"
      @open-classes="navigate('classes'); selectedTurmaId = null"
      @open-scan="openScan"
      @logout="logout"
    />
    <main class="main-content">
      <AppTopbar :title="currentTitle" :name="name" @logout="logout" />
      <section class="content">
        <DashboardScreen
          v-if="screen === 'dashboard'"
          :name="name"
          :exams="exams"
          :questions="questions"
          @navigate="navigate"
          @open-classes="navigate('classes'); selectedTurmaId = null"
          @open-scan="openScan"
          @release="releaseExam"
          @preview="previewSavedExam"
          @statistics="openStatistics"
          @edit="editExam"
          @remove="removeExam"
        />
        <ClassesScreen
          v-if="screen === 'classes'"
          :turmas="turmas"
          :selected-turma="selectedTurma"
          :turma-form="turmaForm"
          :aluno-form="alunoForm"
          :error="error"
          @save-turma="saveTurma"
          @edit-turma="editTurma"
          @open-turma="openTurma"
          @remove-turma="removeTurma"
          @close-turma="closeTurma"
          @save-aluno="saveAluno"
          @remove-aluno="removeAluno"
          @import-students="importStudents"
        />
        <QuestionsScreen
          v-if="screen === 'questions'"
          :questions="questions"
          @new="navigate('newQuestion')"
          @edit="editQuestion"
          @remove="removeQuestion"
        />
        <QuestionForm
          v-if="screen === 'newQuestion'"
          :form="questionForm"
          :editing="Boolean(editingQuestionId)"
          :error="error"
          @save="saveQuestion"
          @cancel="cancelQuestionEdit"
        />
        <ExamsScreen
          v-if="screen === 'exams'"
          :exams="exams"
          :questions="questions"
          @new="navigate('newExam')"
          @release="releaseExam"
          @preview="previewSavedExam"
          @statistics="openStatistics"
          @edit="editExam"
          @remove="removeExam"
        />
        <ExamForm
          v-if="screen === 'newExam'"
          :form="examForm"
          :editing-exam-id="editingExamId"
          :questions="questions"
          :subjects="availableSubjects"
          :classes="availableClasses"
          :error="error"
          @save="saveExam"
          @cancel="editingExamId = null; navigate('exams')"
          @preview="previewExamForm"
          @edit-question="editQuestionFromExam"
          @error="error = $event"
        />
        <ExamPreview
          v-if="screen === 'preview'"
          :exam="previewExam"
          :questions="questions"
          @back="navigate('newExam')"
        />
        <StatisticsScreen v-if="screen === 'statistics'" @back="navigate('dashboard')" />
        <ScanScreen
          v-if="screen === 'scan'"
          :step="scanStep"
          :loading="scanLoading"
          :exams="examsForScan"
          :summaries="scanSummaries"
          :active-exam="scanActiveExam"
          :form="scanForm"
          :turmas="turmas"
          :error="error"
          @open-exam="openScanExam"
          @back="backToScanList"
          @submit="submitScanResult"
          @remove-result="removeScanResult"
        />
      </section>
    </main>
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script>
import { SCREEN_TITLES } from "./constants/screens";
import { dateKey } from "./utils/date";
import { authApi, questoesApi, turmasApi, avaliacoesApi, resultadosApi, isAuthenticated } from "./services/api";

export default {
  data() {
    return {
      screen: "login",
      mode: "login",
      name: "",
      email: "",
      password: "",
      confirmation: "",
      showPassword: false,
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
      questionForm: { text: "", subject: "", topic: "", type: "Múltipla escolha", alternatives: ["", "", "", "", ""], correctAlternative: 0 },
      examForm: {
        name: "",
        selected: [],
        institution: "",
        course: "",
        subject: "",
        professor: "",
        className: "",
        date: "",
        instructions: "",
        logo: "",
        layout: "Uma coluna",
        shuffleQuestions: true,
        shuffleAlternatives: true,
        versions: 1,
        addBlankPage: true
      },
      calendarOpen: false,
      calendarMonth: new Date().getMonth(),
      calendarYear: new Date().getFullYear(),
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
    examsCountLabel() {
      if (!this.exams.length) return "Nenhuma avaliação criada.";
      return `${this.exams.length} ${this.exams.length === 1 ? "avaliação criada" : "avaliações criadas"}.`;
    }
    ,
    questionsCountLabel() {
      if (!this.questions.length) return "Nenhuma questão criada.";
      return `${this.questions.length} ${this.questions.length === 1 ? "questão cadastrada" : "questões cadastradas"}.`;
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
    },
    filteredQuestionsForExam() {
      if (!this.examForm.subject) return this.questions;
      return this.questions.filter((question) => question.subject === this.examForm.subject);
    },
    calendarMonthLabel() {
      return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(this.calendarYear, this.calendarMonth, 1));
    },
    selectedDateKey() {
      const date = this.toIsoDate(this.examForm.date);
      return date ? date.split("-").map(Number).join("-") : "";
    },
    todayDateKey() {
      const today = new Date();
      return dateKey(today);
    },
    calendarDays() {
      const firstDay = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
      const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
      return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
    }
  },
  watch: {
    "examForm.date"(date) {
      const isoDate = this.toIsoDate(date);
      if (!isoDate) return;
      const [year, month] = isoDate.split("-").map(Number);
      this.calendarYear = year;
      this.calendarMonth = month - 1;
    },
    "examForm.subject"(newSubject, oldSubject) {
      if (newSubject === oldSubject) return;
      this.examForm.selected = this.examForm.selected.filter((questionId) => {
        const question = this.questions.find((item) => item.id === questionId);
        return question && question.subject === newSubject;
      });
    }
  },
  async mounted() {
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
  },
  methods: {
    examQuestionsCountLabel(exam) {
      return `${exam.questionIds.length} ${exam.questionIds.length === 1 ? "questão" : "questões"}`;
    },
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
        this.questionForm = { text: "", subject: "", topic: "", type: "Múltipla escolha", alternatives: ["", "", "", "", ""], correctAlternative: 0 };
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
      this.questionForm = {
        text: question.text,
        subject: question.subject,
        topic: question.topic,
        type: "Múltipla escolha",
        alternatives: [...question.alternatives],
        correctAlternative: question.correctAlternative || 0
      };
      this.navigate("newQuestion");
    },
    editQuestionFromExam(question) {
      this.editingQuestionId = question.id;
      this.editingQuestionFromExam = true;
      this.questionForm = {
        text: question.text,
        subject: question.subject,
        topic: question.topic,
        type: "Múltipla escolha",
        alternatives: [...question.alternatives],
        correctAlternative: question.correctAlternative || 0
      };
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
    addAlternative() {
      if (this.questionForm.alternatives.length >= 5) return;
      this.questionForm.alternatives.push("");
    },
    removeAlternative() {
      if (this.questionForm.alternatives.length <= 2) return;
      const removedIndex = this.questionForm.alternatives.length - 1;
      this.questionForm.alternatives.pop();
      if (this.questionForm.correctAlternative === removedIndex) {
        this.questionForm.correctAlternative = 0;
      }
    },
    async saveExam() {
      if (!this.examForm.name.trim()) return (this.error = "Informe o nome da avaliação.");
      if (!this.examForm.selected.length) return (this.error = "Selecione ao menos uma questão.");
      const wasEditing = Boolean(this.editingExamId);
      const selectedClass = this.turmas.find((turma) => turma.name === this.examForm.className);
      const payload = {
        ...this.examForm,
        name: this.examForm.name.trim(),
        questionIds: [...this.examForm.selected],
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
        this.examForm = {
          name: "",
          selected: [],
          institution: "",
          course: "",
          subject: "",
          professor: "",
          className: "",
          date: "",
          instructions: "",
          logo: "",
          layout: "Uma coluna",
          shuffleQuestions: true,
          shuffleAlternatives: true,
          versions: 1,
          addBlankPage: true
        };
        this.editingExamId = null;
        this.notify(wasEditing ? "Avaliação atualizada com sucesso." : "Avaliação criada com sucesso.");
        this.navigate("exams");
      } catch (erro) {
        this.error = erro.message;
      }
    },
    editExam(exam) {
      this.editingExamId = exam.id;
      this.examForm = {
        name: exam.name,
        selected: [...exam.questionIds],
        institution: exam.institution || "",
        course: exam.course || "",
        subject: exam.subject || "",
        professor: exam.professor || "",
        className: exam.className || "",
        date: this.formatStoredDate(exam.date),
        instructions: exam.instructions || "",
        logo: exam.logo || "",
        layout: exam.layout || "Uma coluna",
        shuffleQuestions: exam.shuffleQuestions !== false,
        shuffleAlternatives: exam.shuffleAlternatives !== false,
        versions: exam.versions || 1,
        addBlankPage: exam.addBlankPage !== false
      };
      this.navigate("newExam");
    },
    handleLogoUpload(event) {
      const [file] = event.target.files;
      if (!file) return;
      if (!file.type.startsWith("image/")) return (this.error = "Selecione um arquivo de imagem válido.");
      const reader = new FileReader();
      reader.onload = () => { this.examForm.logo = reader.result; };
      reader.readAsDataURL(file);
    },
    formatDateInput(event) {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
      const parts = [];
      if (digits.length > 0) parts.push(digits.slice(0, 2));
      if (digits.length > 2) parts.push(digits.slice(2, 4));
      if (digits.length > 4) parts.push(digits.slice(4, 8));
      this.examForm.date = parts.join("/");
    },
    formatStoredDate(date) {
      if (!date) return "";
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
      return match ? `${match[3]}/${match[2]}/${match[1]}` : date;
    },
    toIsoDate(date) {
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date || "");
      return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
    },
    updateDateFromPicker(event) {
      this.examForm.date = this.formatStoredDate(event.target.value);
    },
    toggleCalendar() {
      this.calendarOpen = !this.calendarOpen;
      if (this.calendarOpen) {
        const date = this.examForm.date ? this.toIsoDate(this.examForm.date) : "";
        if (date) {
          const [year, month] = date.split("-").map(Number);
          this.calendarYear = year;
          this.calendarMonth = month - 1;
        } else {
          const today = new Date();
          this.calendarYear = today.getFullYear();
          this.calendarMonth = today.getMonth();
        }
      }
    },
    calendarDayIsSelected(day) {
      const selectedDate = this.selectedDateKey || this.todayDateKey;
      return Boolean(day) && `${this.calendarYear}-${this.calendarMonth + 1}-${day}` === selectedDate;
    },
    changeCalendarMonth(offset) {
      const next = new Date(this.calendarYear, this.calendarMonth + offset, 1);
      this.calendarYear = next.getFullYear();
      this.calendarMonth = next.getMonth();
    },
    selectCalendarDay(day) {
      const date = new Date(this.calendarYear, this.calendarMonth, day);
      const formatted = `${String(day).padStart(2, "0")}/${String(this.calendarMonth + 1).padStart(2, "0")}/${this.calendarYear}`;
      this.examForm.date = formatted;
      this.calendarOpen = false;
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
    openStudentPortal() {
      this.studentCode = "";
      this.studentRa = "";
      this.consultedExam = null;
      this.error = "";
      this.screen = "studentPortal";
    },
    questionsForExam(exam) {
      return exam && exam.questionSnapshots ? exam.questionSnapshots : this.questions.filter((question) => exam.questionIds.includes(question.id));
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
    scanTurmaName(exam) {
      const turma = this.turmas.find((item) => item.id === exam.applicationClassId);
      return turma ? turma.name : "Turma";
    },
    scanStatusLabel(examId) {
      const status = this.scanSummaries[examId]?.status;
      if (status === "concluida") return "Corrigida";
      if (status === "em_andamento") return "Em correção";
      return "Pendente";
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

    <main v-if="screen === 'login' || screen === 'register'" class="auth-page">
      <section class="auth-art"><div class="brand"><span class="brand-mark">SGP</span><span>Sistema de Geração de Provas</span></div><div class="art-copy"><span class="eyebrow">EDUCAÇÃO MAIS INTELIGENTE</span><h2>Crie. Organize.<br><strong>Avalie.</strong></h2><p>Uma plataforma feita para simplificar a criação, organização e geração de provas para professores.</p></div><svg class="auth-illustration" viewBox="0 0 500 330" aria-hidden="true"><circle cx="250" cy="160" r="130" fill="#dcf3ed"/><path d="M95 280h320" stroke="#17394e" stroke-width="3"/><rect x="125" y="170" width="55" height="110" rx="8" fill="#8bb1e9" stroke="#17394e" stroke-width="3"/><rect x="180" y="130" width="52" height="150" rx="8" fill="#83d2b6" stroke="#17394e" stroke-width="3"/><path d="M213 105c0-35 26-62 58-62s58 27 58 62l-12 42H225Z" fill="#ffda69" stroke="#17394e" stroke-width="3"/><path d="m270 185 55-64 26 26 50-59 22 20-66 83-30-28-37 47Z" fill="#6592df"/><path d="M230 204c38 0 63 16 84 35v41c-28-12-57-12-84 0ZM314 239c26-20 53-29 79-29v70c-27-1-52 8-79 19Z" fill="#fff" stroke="#17394e" stroke-width="3"/></svg></section>
      <section class="auth-form"><div class="auth-card"><h1>{{ mode === "login" ? "Bem-vindo" : "Crie sua conta" }}</h1><p class="auth-subtitle">{{ mode === "login" ? "Entre para continuar sua jornada." : "Comece a criar provas de forma simples." }}</p>      <form novalidate @submit.prevent="submitAuth"><label v-if="mode === 'register'">Nome completo<input v-model="name" placeholder="Nome completo"></label><label>E-mail<input v-model="email" type="email" placeholder="E-mail"></label><label>Senha<span class="password-field"><input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="Senha"><button type="button" @click="showPassword = !showPassword" :title="showPassword ? 'Ocultar senha' : 'Mostrar senha'">{{ showPassword ? "◉" : "◌" }}</button></span></label><label v-if="mode === 'register'">Confirmar senha<input v-model="confirmation" type="password" placeholder="Confirmar senha"></label><p v-if="error" class="auth-error" role="alert">{{ error }}</p><p v-if="message" class="auth-message" role="status">{{ message }}</p><button class="primary-button" type="submit" :disabled="loadingAuth">{{ loadingAuth ? "Processando..." : (mode === "login" ? "Entrar" : "Cadastrar") }}</button>            </form><button class="text-button" @click="switchMode">{{ mode === "login" ? "Ainda não tenho uma conta" : "Já possuo uma conta" }} <strong>{{ mode === "login" ? "Criar conta" : "Entrar" }}</strong></button></div></section>
    </main>
    <main v-else-if="screen === 'studentPortal'" class="student-portal"><div class="student-portal-card"><span class="brand-mark">SGP</span><h1>Consulta de resultado</h1><p>Informe o código único impresso na sua prova e o seu RA.</p><form @submit.prevent="consultStudentResult"><label>Código da prova<input v-model="studentCode" placeholder="Ex.: SGP-ABC123"></label><label>RA<input v-model="studentRa" placeholder="Seu registro acadêmico"></label><p v-if="error" class="auth-error">{{ error }}</p><button class="primary-button" type="submit">Consultar</button></form><div v-if="consultedExam" class="student-result"><div v-if="!consultedExam.released" class="empty-card"><span>🔒</span><h2>Gabarito ainda não liberado</h2><p>O professor precisa liberar o resultado para esta consulta.</p></div><div v-else-if="!consultedExam.resultAvailable" class="empty-card"><span>⌗</span><h2>Nota ainda não lançada</h2><p>O professor ainda não corrigiu a sua prova, ou o RA informado não confere com o desta avaliação.</p></div><div v-else class="released-result"><span class="eyebrow">RESULTADO LIBERADO</span><h2>{{ consultedExam.name }}</h2><p>Nota: <strong>{{ consultedExam.score }}</strong> / 10.0</p></div></div><button class="text-button" @click="screen = 'login'">Acesso do professor</button></div></main>
    <div v-else class="app-shell">
      <aside class="sidebar"><div class="side-brand"><span class="brand-mark">SGP</span><span>SGP</span></div><nav><button title="Início" :class="{active: screen === 'dashboard'}" @click="navigate('dashboard')">⌂ <span>Início</span></button><button title="Banco de Questões" :class="{active: screen === 'questions' || screen === 'newQuestion'}" @click="navigate('questions')">▤ <span>Banco de Questões</span></button><button title="Minhas Avaliações" :class="{active: screen === 'exams' || screen === 'newExam'}" @click="navigate('exams')">▣ <span>Minhas Avaliações</span></button><button title="Minhas Turmas" :class="{active: screen === 'classes'}" @click="navigate('classes'); selectedTurmaId = null">♙ <span>Minhas Turmas</span></button><button title="Corrigir Provas" :class="{active: screen === 'scan'}" @click="openScan">⌗ <span>Corrigir Provas</span></button></nav><button class="logout" @click="logout" title="Sair">↪ <span>Sair</span></button></aside>
      <main class="main-content"><header class="topbar"><div><span class="muted">SGP / </span>{{ currentTitle }}</div><div class="profile"><span>{{ name.charAt(0).toUpperCase() }}</span><strong>{{ name }}</strong><button @click="logout">Sair</button></div></header><section class="content">
        <template v-if="screen === 'dashboard'"><div class="page-heading"><span class="eyebrow">VISÃO GERAL</span><h1>Olá, {{ name }}!</h1></div><div class="quick-actions"><button @click="navigate('newQuestion')"><b>✎</b><strong>Criar Questão</strong><small>Cadastre sua primeira questão</small></button><button :disabled="!questions.length" @click="navigate('newExam')"><b>▣</b><strong>Montar Prova</strong><small>Disponível após cadastrar questões</small></button><button @click="navigate('classes'); selectedTurmaId = null"><b>♙</b><strong>Minhas Turmas</strong><small>Organize seus alunos</small></button><button @click="openScan"><b>⌗</b><strong>Corrigir Provas</strong><small>Correção pelo navegador</small></button></div><h2 v-if="exams.length" class="dashboard-section-title">Minhas provas:</h2><div v-if="!exams.length" class="empty-card"><span>▤</span><h2>Ainda não há avaliações</h2><p>Suas provas criadas aparecerão aqui.</p></div><div v-else class="question-list"><article v-for="exam in exams" :key="exam.id" class="question-item"><span class="question-number">▣</span><div>        <strong>{{ exam.name }}</strong><small>{{ examQuestionsCountLabel(exam) }} · Código: {{ exam.publicCode || "Código pendente" }} · {{ exam.released === true ? "Gabarito liberado" : "Gabarito bloqueado" }}</small></div>        <div class="question-actions"><button class="edit-button" @click="releaseExam(exam)" :aria-label="exam.released === true ? 'Bloquear gabarito' : 'Liberar gabarito'" :title="exam.released === true ? 'Bloquear gabarito' : 'Liberar gabarito'">{{ exam.released === true ? "🔓" : "🔒" }}</button><button class="edit-button" @click="previewSavedExam(exam)" aria-label="Pré-visualizar prova" title="Pré-visualizar prova">◉</button><button class="edit-button" @click="openStatistics(exam)" aria-label="Ver estatísticas" title="Ver estatísticas">▥</button><button class="edit-button" @click="editExam(exam)" aria-label="Editar avaliação" title="Editar avaliação">✎</button><button class="remove-button" @click="removeExam(exam)" aria-label="Remover avaliação" title="Remover avaliação">×</button></div></article></div></template>
        <template v-if="screen === 'classes'"><div v-if="!selectedTurma"><div class="page-heading"><span class="eyebrow">ORGANIZAÇÃO</span><h1>Minhas Turmas</h1><p>Cadastre suas turmas e organize os alunos.</p></div><form class="form-card turma-form" @submit.prevent="saveTurma"><label>Nome da turma<input v-model="turmaForm.name" placeholder="Digite o nome da turma"></label><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button class="primary-button compact">Criar turma</button></div></form><h2 class="dashboard-section-title">Turmas cadastradas</h2><div v-if="!turmas.length" class="empty-card"><span>♙</span><h2>Nenhuma turma criada</h2><p>Crie sua primeira turma para cadastrar alunos.</p></div><div v-else class="question-list"><article v-for="turma in turmas" :key="turma.id" class="question-item"><span class="question-number">♙</span><div><strong>{{ turma.name }}</strong><small>{{ turma.students.length }} {{ turma.students.length === 1 ? "aluno cadastrado" : "alunos cadastrados" }}</small></div><div class="question-actions"><button class="edit-button" @click="openTurma(turma)" aria-label="Acessar turma">→</button><button class="remove-button" @click="removeTurma(turma)" aria-label="Remover turma">×</button></div></article></div></div><div v-else><div class="page-heading row"><div><span class="eyebrow">TURMA</span><h1>{{ selectedTurma.name }}</h1><p>{{ selectedTurma.students.length }} {{ selectedTurma.students.length === 1 ? "aluno cadastrado" : "alunos cadastrados" }}</p></div><button class="outline-button" @click="closeTurma">Voltar para turmas</button></div>        <form class="form-card turma-form" @submit.prevent="saveAluno"><div class="form-grid"><label>Nome do aluno<input v-model="alunoForm.name" placeholder="Digite o nome do aluno"></label><label>RA<input v-model="alunoForm.ra" placeholder="Registro acadêmico"></label></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button class="primary-button compact">Cadastrar aluno</button><label class="outline-button file-button">Importar CSV<input type="file" accept=".csv,text/csv" @change="importStudents"></label></div></form><h2 class="dashboard-section-title">Alunos da turma</h2><div v-if="!selectedTurma.students.length" class="empty-card"><span>♙</span><h2>Nenhum aluno cadastrado</h2><p>Cadastre o primeiro aluno desta turma.</p></div><div v-else class="question-list"><article v-for="aluno in selectedTurma.students" :key="aluno.id" class="question-item"><span class="question-number">♙</span><div><strong>{{ aluno.name }}</strong><small>RA: {{ aluno.ra }}</small></div><div class="question-actions"><button class="remove-button" @click="removeAluno(aluno)" aria-label="Remover aluno">×</button></div></article></div></div></template>
        <template v-if="screen === 'questions'"><div class="page-heading row"><div><h1>Banco de Questões</h1><p>{{ questionsCountLabel }}</p></div><button class="primary-button compact" @click="navigate('newQuestion')">＋ Nova questão</button></div><div v-if="!questions.length" class="empty-card"><span>✎</span><h2>Seu banco está vazio</h2><p>Cadastre a primeira questão para começar.</p><button class="primary-button compact" @click="navigate('newQuestion')">Cadastrar primeira questão</button></div><div v-else class="question-list"><article v-for="(question, index) in questions" :key="question.id" class="question-item"><span class="question-number">{{ index + 1 }}</span><div><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }} · {{ question.type }}</small></div><div class="question-actions"><button class="edit-button" @click="editQuestion(question)" aria-label="Editar questão">✎</button><button class="remove-button" @click="removeQuestion(question)" aria-label="Remover questão">×</button></div></article></div></template>
        <template v-if="screen === 'newQuestion'"><div class="page-heading"><span class="eyebrow">BANCO DE QUESTÕES</span><h1>{{ editingQuestionId ? "Editar Questão" : "Nova Questão" }}</h1></div><form class="form-card" @submit.prevent="saveQuestion"><div class="form-grid"><label>Disciplina<input v-model="questionForm.subject" placeholder="Digite uma disciplina"></label><label>Assunto<input v-model="questionForm.topic" placeholder="Digite um assunto"></label></div><label>Texto da questão<textarea v-model="questionForm.text" placeholder="Digite o texto da questão"></textarea></label><div class="alternatives"><p class="field-title">Alternativas <span>Marque a resposta correta</span></p><label v-for="(alternative, index) in questionForm.alternatives" :key="index"><span>{{ String.fromCharCode(65 + index) }})</span><input v-model="questionForm.alternatives[index]" :placeholder="'Alternativa ' + String.fromCharCode(65 + index)"><input class="radio" type="radio" v-model="questionForm.correctAlternative" :value="index" :aria-label="'Alternativa correta ' + String.fromCharCode(65 + index)"></label><div class="alternative-actions"><button type="button" class="item-button" @click="addAlternative">＋ Adicionar alternativa</button><button type="button" class="item-button" @click="removeAlternative" :disabled="questionForm.alternatives.length <= 2">− Remover última alternativa</button></div></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button type="button" class="outline-button" @click="cancelQuestionEdit">Cancelar</button><button class="primary-button compact">{{ editingQuestionId ? "Salvar alterações" : "Salvar questão" }}</button></div></form></template>
        <template v-if="screen === 'exams'"><div class="page-heading row"><div><span class="eyebrow">AVALIAÇÕES</span><h1>Minhas Avaliações</h1><p>{{ examsCountLabel }}</p></div><button class="primary-button compact" :disabled="!questions.length" @click="navigate('newExam')">＋ Nova avaliação</button></div><div v-if="!exams.length" class="empty-card"><span>▣</span><h2>Nenhuma avaliação criada</h2><p>Cadastre questões e monte sua primeira prova.</p></div><div v-else class="question-list"><article v-for="exam in exams" :key="exam.id" class="question-item"><span class="question-number">▣</span><div><strong>{{ exam.name }}</strong>        <small>{{ examQuestionsCountLabel(exam) }} · Código: {{ exam.publicCode }} ·         {{ exam.released === true ? "Gabarito liberado" : "Gabarito bloqueado" }}</small></div>                <div class="question-actions"><button class="edit-button" @click="releaseExam(exam)" :aria-label="exam.released ? 'Gabarito liberado' : 'Liberar gabarito'" :title="exam.released ? 'Gabarito liberado' : 'Liberar gabarito'">{{ exam.released ? "🔓" : "🔒" }}</button><button class="edit-button" @click="previewSavedExam(exam)" aria-label="Pré-visualizar prova" title="Pré-visualizar prova">◉</button><button class="edit-button" @click="openStatistics(exam)" aria-label="Ver estatísticas" title="Ver estatísticas">▥</button><button class="edit-button" @click="editExam(exam)" aria-label="Editar avaliação" title="Editar avaliação">✎</button><button class="remove-button" @click="removeExam(exam)" aria-label="Remover avaliação" title="Remover avaliação">×</button></div></article></div></template>
        <template v-if="screen === 'newExam'"><div class="page-heading"><span class="eyebrow">AVALIAÇÕES</span><h1>{{ editingExamId ? "Editar Avaliação" : "Montar Prova" }}</h1><p>Configure os dados da prova, selecione as questões e prepare o documento editável.</p></div><form class="form-card" @submit.prevent="saveExam"><h2 class="form-section-title">Dados da avaliação</h2><div class="form-grid"><label>Nome da avaliação<input v-model="examForm.name" placeholder="Nome da sua prova"></label>        <label>Data da aplicação<div class="date-field"><input class="date-text-input" v-model="examForm.date" @input="formatDateInput" type="text" inputmode="numeric" placeholder="dd/mm/yyyy" maxlength="10">        <button type="button" class="calendar-trigger" @click="toggleCalendar" aria-label="Abrir calendário"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg></button><div v-if="calendarOpen" class="calendar-popover"><div class="calendar-header"><button type="button" @click="changeCalendarMonth(-1)" aria-label="Mês anterior">‹</button><strong>{{ calendarMonthLabel }}</strong><button type="button" @click="changeCalendarMonth(1)" aria-label="Próximo mês">›</button></div><div class="calendar-weekdays"><span v-for="weekday in ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']" :key="weekday">{{ weekday }}</span></div><div class="calendar-days"><button v-for="(day, index) in calendarDays" :key="index" type="button" :class="{ empty: !day, today: calendarDayIsSelected(day) }" :disabled="!day" @click="day && selectCalendarDay(day)">{{ day }}</button></div></div></div></label><label>Instituição<input v-model="examForm.institution" placeholder="Nome da instituição"></label><label>Curso<input v-model="examForm.course" placeholder="Nome do curso"></label><label>Disciplina<select v-model="examForm.subject"><option value="">Selecione uma disciplina</option><option v-for="subject in availableSubjects" :key="subject" :value="subject">{{ subject }}</option></select></label><label>Professor<input v-model="examForm.professor" placeholder="Nome do professor"></label><label>Turma<select v-model="examForm.className"><option value="">Selecione uma turma</option><option v-for="className in availableClasses" :key="className" :value="className">{{ className }}</option></select></label></div><h2 class="form-section-title">Cabeçalho e instruções</h2><div class="header-config"><label>Logo da instituição<input type="file" accept="image/*" @change="handleLogoUpload"></label><img v-if="examForm.logo" class="logo-preview" :src="examForm.logo" alt="Logo da instituição"></div><label>Instruções da prova<textarea v-model="examForm.instructions" placeholder="Digite as orientações para os alunos"></textarea></label><h2 class="form-section-title">Configurações do documento</h2><div class="form-grid"><label>Layout da prova<select v-model="examForm.layout"><option>Uma coluna</option><option>Duas colunas</option></select></label><label>Número de versões<input v-model.number="examForm.versions" type="number" min="1"></label></div><div class="toggle-list"><label><input v-model="examForm.shuffleQuestions" type="checkbox"> Embaralhar questões</label><label><input v-model="examForm.shuffleAlternatives" type="checkbox"> Embaralhar alternativas</label><label><input v-model="examForm.addBlankPage" type="checkbox"> Adicionar página em branco se necessário para impressão frente e verso</label></div><h2 class="form-section-title">Questões da avaliação</h2><p class="selection-title">Selecione as questões:</p><div v-if="!questions.length" class="empty-card compact"><span>✎</span><h2>Sem questões disponíveis</h2><p>Cadastre a primeira questão para começar.</p></div><div v-else class="selection-list"><label v-for="question in filteredQuestionsForExam" :key="question.id"><input type="checkbox" v-model="examForm.selected" :value="question.id"><span><strong>{{ question.text }}</strong><small>{{ question.subject }} · {{ question.topic }}</small></span><button v-if="editingExamId" type="button" class="edit-button selection-edit" @click.stop.prevent="editQuestionFromExam(question)" aria-label="Editar questão da avaliação">✎</button></label></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button type="button" class="outline-button" @click="editingExamId = null; navigate('exams')">Cancelar</button>        <button type="button" class="outline-button" @click="previewExamForm">Pré-visualizar</button><button class="primary-button compact">{{ editingExamId ? "Salvar alterações" : "Salvar avaliação" }}</button></div></form></template>
        <template v-if="screen === 'preview'"><div class="page-heading row"><div><span class="eyebrow">VISUALIZAÇÃO</span><h1>Pré-visualização da prova</h1><p>Confira o caderno e a folha de respostas antes da geração do documento.</p></div><button class="outline-button" @click="navigate('newExam')">Voltar para montagem</button></div><div class="preview-grid"><section class="document-preview"><div class="preview-paper"><div class="preview-header"><img v-if="previewExam && previewExam.logo" :src="previewExam.logo" alt="Logo da instituição"><div><strong>{{ previewExam && previewExam.institution || "Instituição" }}</strong><span>{{ previewExam && previewExam.course || "Curso" }}</span><span>{{ previewExam && previewExam.subject || "Disciplina" }}</span></div></div><h2>{{ previewExam && previewExam.name || "Nome da avaliação" }}</h2><p class="preview-meta">{{ previewExam && previewExam.professor || "Professor" }} · {{ previewExam && previewExam.className || "Turma" }} · {{ previewExam && previewExam.date || "Data da aplicação" }}</p><p v-if="previewExam && previewExam.instructions" class="preview-instructions">{{ previewExam.instructions }}</p><article v-for="(question, index) in (previewExam ?         questionsForExam(previewExam) : [])" :key="question.id" class="preview-question"><strong>{{ index + 1 }}. {{ question.text }}</strong><span v-for="(alternative, alternativeIndex) in question.alternatives" :key="alternativeIndex">{{ String.fromCharCode(65 + alternativeIndex) }}) {{ alternative }}</span></article><p v-if="previewExam && !previewExam.questionIds.length" class="preview-empty">As questões selecionadas aparecerão aqui.</p></div></section><section class="document-preview answer-sheet"><div class="preview-paper"><div class="answer-sheet-heading"><span class="qr-placeholder">QR</span><div><h2>Folha de respostas</h2><p>{{ previewExam && previewExam.name || "Nome da avaliação" }}</p></div></div><label>Aluno: ____________________________________</label><label>RA: _______________________________________</label><div class="answer-grid"><div v-for="number in (previewExam ? previewExam.questionIds.length : 5)" :key="number"><strong>{{ number }}</strong><span v-for="letter in ['A', 'B', 'C', 'D', 'E']" :key="letter">{{ letter }} ○</span></div></div><p class="preview-note">Prévia visual da folha de respostas. O QR Code e a leitura serão implementados posteriormente.</p></div></section></div></template>
        <template v-if="screen === 'statistics'"><div class="page-heading row"><div><span class="eyebrow">ANÁLISE PEDAGÓGICA</span><h1>Estatísticas da avaliação</h1></div><button class="outline-button" @click="navigate('dashboard')">Voltar</button></div><section class="empty-card"><span>▥</span><h2>Estatísticas indisponíveis</h2><p>Os resultados só serão exibidos quando as respostas corrigidas estiverem persistidas no sistema.</p></section></template>
        <template v-if="screen === 'scan'">
        <div v-if="scanStep === 'list'"><div class="page-heading"><span class="eyebrow">CORREÇÃO</span><h1>Corrigir Provas</h1><p>Lance a nota de cada aluno por RA. Só aparecem aqui avaliações já aplicadas a uma turma.</p></div><div v-if="scanLoading" class="empty-card"><span>⌗</span><h2>Carregando…</h2><p>Buscando o andamento da correção de cada avaliação.</p></div><div v-else-if="!examsForScan.length" class="empty-card"><span>⌗</span><h2>Nenhuma avaliação para corrigir</h2><p>Aplique uma avaliação a uma turma em "Montar Prova" para liberar a correção.</p></div><div v-else class="question-list"><article v-for="exam in examsForScan" :key="exam.id" class="question-item"><span class="question-number">⌗</span><div><strong>{{ exam.name }}</strong><small>{{ scanTurmaName(exam) }} · {{ scanStatusLabel(exam.id) }}<template v-if="scanSummaries[exam.id]"> · {{ scanSummaries[exam.id].corrigidos }}/{{ scanSummaries[exam.id].totalMatriculados }} corrigidas</template></small></div><div class="question-actions"><button class="edit-button" @click="openScanExam(exam)" aria-label="Corrigir avaliação" title="Corrigir avaliação">▶</button></div></article></div></div>
        <div v-else-if="scanActiveExam"><div class="page-heading row"><div><span class="eyebrow">CORREÇÃO</span><h1>{{ scanActiveExam.name }}</h1><p>{{ scanTurmaName(scanActiveExam) }} · {{ scanStatusLabel(scanActiveExam.id) }}</p></div><button class="outline-button" @click="backToScanList">Voltar</button></div><form class="form-card" @submit.prevent="submitScanResult"><h2 class="form-section-title">Lançar nota</h2><div class="form-grid"><label>RA do aluno<input v-model="scanForm.ra" placeholder="Registro acadêmico"></label><label>Nota<input v-model.number="scanForm.score" type="number" min="0" max="10" step="0.1" placeholder="0 a 10"></label></div><p v-if="error" class="auth-error">{{ error }}</p><div class="form-actions"><button class="primary-button compact">Registrar nota</button></div></form><h2 class="dashboard-section-title">Alunos já corrigidos</h2><div v-if="!scanSummaries[scanActiveExam.id] || !scanSummaries[scanActiveExam.id].resultados.length" class="empty-card compact"><span>⌗</span><h2>Nenhum aluno corrigido ainda</h2><p>Lance a primeira nota pelo formulário acima.</p></div><div v-else class="question-list"><article v-for="resultado in scanSummaries[scanActiveExam.id].resultados" :key="resultado.studentId" class="question-item"><span class="question-number">✓</span><div><strong>{{ resultado.studentName }}</strong><small>RA: {{ resultado.ra }} · Nota: {{ resultado.score }}</small></div><div class="question-actions"><button class="remove-button" @click="removeScanResult(resultado)" aria-label="Remover nota">×</button></div></article></div></div>
        </template>
      </section></main><div v-if="toast" class="toast">{{ toast }}</div>
    </div>
  
</template>

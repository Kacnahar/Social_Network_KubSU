export interface Mailer {
  sendLoginCode(email: string, code: string): Promise<void>;
}

// Заглушка на время разработки: вместо письма пишет код в журнал сервера
export class ConsoleMailer implements Mailer {
  constructor(private readonly log: (message: string) => void) {}

  async sendLoginCode(email: string, code: string): Promise<void> {
    this.log(`[письмо-заглушка] код входа для ${email}: ${code}`);
  }
}
